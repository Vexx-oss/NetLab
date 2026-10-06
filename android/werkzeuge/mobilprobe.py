"""Mobilprobe: die Android-Fassung auf Handy-Maßen in einem ECHTEN Browser messen.

Warum: Ein APK lässt sich bauen und signieren, ohne dass es auf einem Telefon je
gelaufen ist. Diese Probe stellt den Bildschirm eines Telefons nach (Maße, Berührung,
Ausrichtung) und misst im geladenen Dokument, was die Oberfläche wirklich tut — kein
Augenschein, sondern Zahlen aus dem Browser.

Gemessen wird nach dem Laden eines Beispielnetzes im Labor:
  * passt die Oberfläche in den Bildschirm (Überlauf) oder läuft sie heraus
  * wie breit ist die Zeichenfläche, welcher Anteil der Fensterbreite ist das, wie viel
    tote Fläche bleibt rechts davon
  * welche Leisten gibt es, wie viele Zeilen und wie hoch sind sie
  * welche Elemente schneiden Text ab (scrollWidth > clientWidth + 2) und welche ragen
    aus dem Bildschirm heraus
  * die kleinste Trefferfläche aller sichtbaren Knöpfe, Zahl der Knöpfe unter 44×44 px
  * überdeckt eine schwebende Leiste ein Gerät der Zeichenfläche (Kollision)
  * welche sicheren Ränder (--nl-safe-* bzw. env(safe-area-inset-*)) kommen an
  * welcher Zoom stellt sich ein, wie viele Geräte werden gezeichnet
  * greift `pointer: coarse`, welche JS-Fehler gibt es

Aufruf (ein Profil — für Einzelmessungen und Bilder):
    python android/werkzeuge/mobilprobe.py --geraet pixel7 --ausrichtung hoch \\
        --ziehprobe --bild Nachweise/android/nachher-hoch-start.png \\
        --bild-labor Nachweise/android/nachher-hoch-labor.png
    python android/werkzeuge/mobilprobe.py --breite 360 --hoehe 640 --thema hell

Aufruf (ein Lauf über viele Profile — EIN Browser, EINE Tabelle):
    python android/werkzeuge/mobilprobe.py                       # 4 Geräte × hoch/quer, dunkel
    python android/werkzeuge/mobilprobe.py --lauf --thema dunkel,hell
    python android/werkzeuge/mobilprobe.py --lauf --geraet pixel7,klein --ziehprobe

Der Lauf prüft die Zielwerte selbst und endet mit Rückgabewert 1, sobald einer verletzt
ist. Die Zielwerte (aus dem Auftrag des Nutzers, Stand 06.10.2026):
  * Zeichenfläche ≥ 85 % der Fensterbreite im Hochformat, ≥ 80 % im Querformat
  * tote Fläche rechts ≤ 8 px
  * Werkzeugleiste ≤ 1 Zeile und ≤ 56 px hoch im Hochformat, ≤ 2 Zeilen im Querformat
    („Zeile“ = Anzahl verschiedener Oberkanten der Einzelteile; eine senkrechte Spalte
     wäre damit bewusst ROT — die Zielwerte sind wörtlich aus dem Auftrag übernommen)
  * kein abgeschnittener Text, nichts ragt aus dem Bildschirm
  * keine Trefferfläche < 44×44 px
  * Überlauf ≤ 2 px, 0 JS-Fehler, Labor lädt, Geräte werden gezeichnet
  * Kabelzug mit dem Finger erzeugt ein Kabel (--ziehprobe)
  * Zoom ≥ 0.5 im Hochformat bei Vorlage salon

Zusätzliche Proben (nicht Teil der Zielwerte, aber Teil des Berichts):
  --bedienprobe  klickt Navigation, Gerätekategorien und Dock-Reiter an und stellt fest,
                 ob sie erreichbar sind (auch wenn ein Blatt sie erst zeigen muss)
  --drehprobe    dreht das Fenster OHNE Neuladen (Hoch ↔ Quer) und prüft, ob der Stand
                 überlebt (Marke im window, Kabel, Geräte, Ansicht)
  --statisch     prüft ohne Browser, ob mobil.css/mobil.js wirklich in der gebauten
                 Seite stecken und ob der Bau aus den Quellen reproduzierbar ist

Beendet wird ausschließlich der Browser, den dieses Werkzeug selbst gestartet hat
(AGENTS.md Regel 1). Den WebSocket-Teil gibt es schon in `tools/starttest.py` — er
wird von dort geholt, statt ihn ein zweites Mal zu schreiben.
"""
import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent        # …/Netzwerk-Labor/android
PROJEKT = HIER.parent
sys.path.insert(0, str(PROJEKT / "tools"))
from starttest import WS, browser, warte_auf_port    # noqa: E402

STANDARD = HIER / "bau" / "assets" / "index.html"
BAU = HIER / "bau"
MOBIL = HIER / "mobil"
BILDER_STANDARD = PROJEKT / "Nachweise" / "android"

# ---------------------------------------------------------------- Geräte-Profile
# Maße in CSS-Pixeln. `gross` ist ein großes Telefon (iPhone-Max-Klasse, 428×926),
# `tablet` ein kleines Tablet. Die Werte sind Annahmen für die Messung, keine
# Aussage über ein bestimmtes Gerät — das steht so auch im Bericht.
GERAETE = {
    "pixel7": (412, 915, 2.625, "Pixel 7"),
    "klein": (360, 640, 3.0, "kleines Telefon 360×640"),
    "gross": (428, 926, 3.0, "großes Telefon 428×926"),
    "tablet": (800, 1280, 2.0, "Tablet 800×1280"),
}
AUSRICHTUNGEN = ("hoch", "quer")
THEMEN = ("hell", "dunkel")

FEHLERSAMMLER = (
    "<script>window.__nlFehler=[];window.__nlKonsole=[];"
    "window.addEventListener('error',function(e){window.__nlFehler.push(String(e.message))});"
    "window.addEventListener('unhandledrejection',function(e){window.__nlFehler.push('Promise: '+String(e.reason))});"
    "(function(){var c=console.error;console.error=function(){try{window.__nlKonsole.push("
    "Array.prototype.join.call(arguments,' ').slice(0,200))}catch(e){};return c.apply(console,arguments)}})();"
    "</script>"
)

LABOR_LADEN = r"""
(async () => {
  const e = %s();
  UI.labor.laden(e, {titel: 'Mobilprobe', sandbox: true});
  return {ok: true, geraete: Object.keys(UI.labor.netz.geraete).length};
})()
"""

# Nach dem Laden ausdrücklich die Labor-Ansicht zeigen: `UI.labor.laden` wechselt nur unter
# Bedingungen dorthin (src/ui/spiel.js). Ohne das bleibt nach --mit-start der Hub stehen und
# die Messung wäre dieselbe Zeile zweimal.
LABOR_ZEIGEN = r"""
(() => { try {
  if (typeof UI === 'undefined' || !UI.app) return null;
  UI.app.ansicht('labor');
  return UI.app.aktuell;
} catch (e) { return 'Fehler: ' + e; } })()
"""

# Thema erzwingen: `Emulation.setEmulatedMedia` kommt in dieser Edge-Fassung nicht
# verlässlich an (gemessen 06.10.2026, matchMedia meldete weiter „hell"). Verlässlich ist
# der spieleigene Umschalter — genau die Handlung, die ein Nutzer mit dem Mond-Knopf ausführt.
THEMA_SETZEN = r"""
(() => { try {
  if (typeof UI === 'undefined' || !UI.app) return 'kein UI';
  const sollDunkel = %s;
  if (typeof UI.app.istDunkel === 'function' && UI.app.istDunkel() !== sollDunkel) UI.app.themaUmschalten();
  return document.documentElement.dataset.theme || '(aus dem System)';
} catch (e) { return 'Fehler: ' + e; } })()
"""

# ---------------------------------------------------------------- Einpassen nachmessen
# Statt einen Netzmaßstab zu raten: das Spiel selbst fragen. `UI.labor.einpassen(false)`
# setzt den Zoom neu auf „alles im Bild". Ist der Zoom danach mehr als 2 % größer als der
# ausgelieferte, war die Zeichnung nach dem Laden NICHT eingepasst.
# Belegt am 06.10.2026 (Fassung 2.226.872 B): im Querformat stand nach dem Laden Zoom 0.334
# gegen 0.4957 nach dem Nachmessen — die Auftragszeile war nach dem ersten Einpassen
# erschienen und der Zoom blieb stehen (Ursache im Spiel: sichtbarMachen()/ResizeObserver,
# nicht in android/mobil/).
EINPASSEN = r"""
(async () => {
  const R = n => Math.round(n);
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
  const zoomJetzt = () => {
    const svg = [...document.querySelectorAll('.lb-svg')].filter(sichtbar)[0];
    if (!svg) return null;
    const g = svg.querySelector('g[transform*="scale"]');
    const m = g ? /scale\(([\d.]+)\)/.exec(g.getAttribute('transform') || '') : null;
    return m ? +m[1] : null;
  };
  const kb = e => { const b = e.getBoundingClientRect();
    return {x: R(b.x), y: R(b.y), w: R(b.width), h: R(b.height)}; };
  const aus = {vorher: null, nachher: null, gewinn: null, fehler: null, leinwand: null, welt: null};
  try {
    const lw = [...document.querySelectorAll('.lb-leinwand')].filter(sichtbar)[0];
    aus.leinwand = lw ? kb(lw) : null;
    const welt = document.querySelector('.lb-welt');
    if (welt && welt.getBBox) { const b = welt.getBBox();
      aus.welt = {w: R(b.width), h: R(b.height)}; }
    aus.vorher = zoomJetzt();
    if (typeof UI === 'undefined' || !UI.labor || typeof UI.labor.einpassen !== 'function') {
      aus.fehler = 'UI.labor.einpassen gibt es nicht';
      return aus;
    }
    UI.labor.einpassen(false);
    await new Promise(r => setTimeout(r, 500));
    aus.nachher = zoomJetzt();
    if (aus.vorher && aus.nachher) aus.gewinn = +(aus.nachher / aus.vorher).toFixed(4);
  } catch (e) { aus.fehler = String(e); }
  return aus;
})()
"""

# ---------------------------------------------------------------- alle Ansichten
# Der Auftrag des Leads: nicht nur das Labor, sondern alle sieben Navigationsansichten auf
# Knöpfe unter 44×44 px, abgeschnittenen Text, aus dem Bildschirm ragende Elemente und
# JS-Fehler prüfen. Die Texte in der Zeichnung (.lb-svg) sind ausgenommen: sie skalieren mit
# dem Zoom und sind auch in der Schreibtisch-Fassung kleiner (Befund von „mobil-flaeche").
ANSICHTEN = r"""
(async () => {
  const R = n => Math.round(n);
  const kb = e => { const b = e.getBoundingClientRect();
    return {x: R(b.x), y: R(b.y), w: R(b.width), h: R(b.height), rechts: R(b.right), unten: R(b.bottom)}; };
  const kl = e => (e.getAttribute('class') || '').trim();
  const txt = e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
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
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const vv = window.visualViewport;
  const bsw = vv ? R(vv.width) : screen.width;
  const bsh = vv ? R(vv.height) : screen.height;
  const aus = {ansichten: [], fehler: null};
  try {
    if (typeof UI === 'undefined' || !UI.app) { aus.fehler = 'kein UI'; return aus; }
    const liste = UI.app.liste ? UI.app.liste() : [];
    for (const a of liste) {
      const knopf = [...document.querySelectorAll('[data-ansicht="' + a.name + '"]')].filter(sichtbar)[0];
      if (knopf) { knopf.click(); await warte(430); }
      const beh = document.querySelector('.ansicht[data-ansicht="' + a.name + '"]');
      const e = {ziel: a.name, titel: a.titel, aktiv: UI.app.aktuell,
                 sichtbar: beh ? sichtbar(beh) : false, masse: beh && sichtbar(beh) ? kb(beh) : null,
                 fehlerZahl: (window.__nlFehler || []).length,
                 unter44: [], abgeschnitten: [], ausserhalb: []};
      const knoepfe = [...document.querySelectorAll('button, [role="button"]')].filter(sichtbar);
      e.knoepfe = knoepfe.length;
      /* Kleinste Trefferfläche DIESER Ansicht — der Lead will sie je Ansicht sehen, nicht nur
         die Verstöße („0 unter 44 px" allein sagt nichts über den Abstand zur Grenze). */
      e.kleinste = null;
      for (const k of knoepfe) {
        const b = k.getBoundingClientRect();
        if (!e.kleinste || Math.min(b.width, b.height) < Math.min(e.kleinste.w, e.kleinste.h)) {
          e.kleinste = {w: R(b.width), h: R(b.height), klasse: kl(k), text: txt(k),
                        imBereich: !!(beh && beh.contains(k))};
        }
        if (b.width < 44 || b.height < 44) {
          e.unter44.push({klasse: kl(k), w: R(b.width), h: R(b.height), text: txt(k),
                          imBereich: !!(beh && beh.contains(k))});
        }
      }
      /* Text und Ragen nur INNERHALB der Ansicht; die Zeichnung ist ausgenommen.
         „Abgeschnitten“ heißt: ein Behälter mit overflow hidden/clip verliert Inhalt
         (scrollWidth/scrollHeight größer als der sichtbare Platz). Behälter, die
         ausdrücklich scrollen (overflow auto/scroll), zählen nicht — dort ist Scrollen
         die Bedienung, nicht ein Fehler. „Außerhalb“ wird waagerecht geprüft: senkrecht
         scrollt jede Ansicht, das ist kein Randfehler. */
      for (const el of (beh ? beh.querySelectorAll('*') : [])) {
        if (el.closest('.lb-svg')) continue;
        if (!(el.textContent || '').trim()) continue;
        if (!sichtbar(el)) continue;
        const st = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        /* Ist der Inhalt innerhalb eines waagerecht scrollenden/klemmenden Behälters?
           auto/scroll = erreichbar durch Wischen (kein Fehler), hidden/clip = wirklich weg. */
        const waagerechtBehaelter = (() => {
          for (let k = el.parentElement; k && k !== document.body; k = k.parentElement) {
            const o = getComputedStyle(k).overflowX;
            if (o === 'auto' || o === 'scroll') return 'scrollbar';
            if (o === 'hidden' || o === 'clip') return 'abgeschnitten';
          }
          return null;
        })();
        const absicht = !!(st.webkitLineClamp && st.webkitLineClamp !== 'none');
        const schneidetX = st.overflowX === 'hidden' || st.overflowX === 'clip';
        const schneidetY = st.overflowY === 'hidden' || st.overflowY === 'clip';
        if (schneidetX && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
          e.abgeschnitten.push({art: 'waagerecht', absicht: absicht, klasse: kl(el),
                                platz: el.clientWidth, braucht: el.scrollWidth, text: txt(el)});
        } else if (schneidetY && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 2) {
          e.abgeschnitten.push({art: 'senkrecht', absicht: absicht, klasse: kl(el),
                                platz: el.clientHeight, braucht: el.scrollHeight, text: txt(el)});
        }
        if (el.clientWidth > 0 && (b.left < -2 || b.right > bsw + 2)) {
          e.ausserhalb.push({klasse: typeof el.className === 'string' ? el.className : (el.className.baseVal || ''),
                             links: R(b.left), rechts: R(b.right), oben: R(b.top),
                             unten: R(b.bottom), text: txt(el),
                             erreichbar: waagerechtBehaelter || 'nein'});
        }
      }
      aus.ansichten.push(e);
    }
    /* Labor wieder zeigen, damit nachfolgende Proben denselben Zustand sehen. */
    const lb = [...document.querySelectorAll('[data-ansicht="labor"]')].filter(sichtbar)[0];
    if (lb) { lb.click(); await warte(360); }
  } catch (e) { aus.fehler = String(e); }
  return aus;
})()
"""

# ---------------------------------------------------------------- Zoomprobe (IP-Beschriftungen)
# Die klickbaren IP-Beschriftungen auf der Zeichenfläche (.ger-ip.kopierbar) skalieren mit dem
# Zoom und sind auch in der Schreibtisch-Fassung kleiner als 44 px. Auf dem Telefon sind sie bei
# kleinem Zoom unsichtbar. Diese Probe geht den NUTZERWEG: Zoom-Menü öffnen, „Zoom 100 %" klicken,
# nachmessen — und danach wieder einpassen.
ZOOM_PROBE = r"""
(async () => {
  const R = n => Math.round(n);
  const kb = e => { const b = e.getBoundingClientRect();
    return {x: R(b.x), y: R(b.y), w: R(b.width), h: R(b.height)}; };
  const kl = e => (e.getAttribute('class') || '').trim();
  const txt = e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
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
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const zoomJetzt = () => {
    const svg = [...document.querySelectorAll('.lb-svg')].filter(sichtbar)[0];
    if (!svg) return null;
    const g = svg.querySelector('g[transform*="scale"]');
    const m = g ? /scale\(([\d.]+)\)/.exec(g.getAttribute('transform') || '') : null;
    return m ? +m[1] : null;
  };
  const ips = () => [...document.querySelectorAll('.ger-ip')].filter(sichtbar).map(e => {
    const b = e.getBoundingClientRect();
    return {klasse: kl(e), w: R(b.width), h: R(b.height), text: txt(e)};
  });
  const knoepfeKlein = () => [...document.querySelectorAll('button, [role="button"]')].filter(sichtbar)
    .filter(e => { const b = e.getBoundingClientRect(); return b.width < 44 || b.height < 44; })
    .map(e => { const b = e.getBoundingClientRect();
      return {klasse: kl(e), w: R(b.width), h: R(b.height), text: txt(e)}; });
  const aus = {vorher: null, nachher: null, zurueck: null, geklickt: false, fehler: null};
  try {
    aus.vorher = {zoom: zoomJetzt(), ips: ips(), unter44: knoepfeKlein().length};
    const zk = [...document.querySelectorAll('.lb-zoomtext')].filter(sichtbar)[0];
    if (!zk) { aus.fehler = 'kein Zoom-Knopf sichtbar'; return aus; }
    zk.click();
    await warte(320);
    const ziel = [...document.querySelectorAll('.menue-punkt')].filter(sichtbar)
      .find(p => /100\s*%/.test(txt(p)) || /100\s*%/.test(p.textContent || ''));
    if (!ziel) { aus.fehler = 'Menüpunkt „Zoom 100 %" nicht gefunden'; return aus; }
    ziel.click();
    aus.geklickt = true;
    await warte(700);
    aus.nachher = {zoom: zoomJetzt(), ips: ips(), unter44: knoepfeKlein()};
  } catch (e) { aus.fehler = String(e); }
  try {
    if (typeof UI !== 'undefined' && UI.labor && typeof UI.labor.einpassen === 'function') {
      UI.labor.einpassen(false);
      await warte(450);
    }
  } catch (e) { /* egal */ }
  aus.zurueck = zoomJetzt();
  return aus;
})()
"""

# ---------------------------------------------------------------- Zoomwechsel (zweites Ticket)
# Auftrag des Leads (06.10.2026): Überschreibt die Heilung den vom Nutzer selbst gewählten Zoom?
# Ablauf wie ein Nutzer: im Labor per Zoom-Menü vergrößern, dann ein zweites Ticket laden
# (Vorlage praxis) und messen, ob danach sauber eingepasst ist und keine JS-Fehler entstehen.
# Läuft deshalb GANZ AM ENDE eines Profils — die Vorlage wechselt dabei.
ZOOM_WECHSEL = r"""
(async () => {
  const R = n => Math.round(n);
  const txt = e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
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
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const zoomJetzt = () => {
    const svg = [...document.querySelectorAll('.lb-svg')].filter(sichtbar)[0];
    if (!svg) return null;
    const g = svg.querySelector('g[transform*="scale"]');
    const m = g ? /scale\(([\d.]+)\)/.exec(g.getAttribute('transform') || '') : null;
    return m ? +m[1] : null;
  };
  const aus = {zoomVorher: null, zoomNutzer: null, zoomNachTicket: null, zoomNachEinpassen: null,
               geklickt: 0, jsFehlerVorher: 0, jsFehlerNachher: 0, geraeteNachher: null, fehler: null};
  try {
    aus.jsFehlerVorher = (window.__nlFehler || []).length;
    aus.zoomVorher = zoomJetzt();
    const zk = [...document.querySelectorAll('.lb-zoomtext')].filter(sichtbar)[0];
    if (!zk) { aus.fehler = 'kein Zoom-Knopf sichtbar'; return aus; }
    for (let i = 0; i < 2; i++) {
      zk.click();
      await warte(300);
      const punkt = [...document.querySelectorAll('.menue-punkt')].filter(sichtbar)
        .find(p => /vergrößern|vergroessern/i.test(p.textContent || ''));
      if (!punkt) { aus.fehler = 'Menüpunkt „Vergrößern" nicht gefunden'; break; }
      punkt.click();
      aus.geklickt++;
      await warte(450);
    }
    aus.zoomNutzer = zoomJetzt();
    if (typeof UI === 'undefined' || !UI.labor || typeof UI.labor.laden !== 'function') {
      aus.fehler = 'UI.labor.laden fehlt';
      return aus;
    }
    UI.labor.laden(DATEN.beispiele.praxis(), {titel: 'Zweite Probe', sandbox: true});
    await warte(900);
    aus.zoomNachTicket = zoomJetzt();
    try { aus.geraeteNachher = Object.keys(UI.labor.netz.geraete).length; } catch (e) {}
    aus.jsFehlerNachher = (window.__nlFehler || []).length;
    if (typeof UI.labor.einpassen === 'function') {
      UI.labor.einpassen(false);
      await warte(500);
      aus.zoomNachEinpassen = zoomJetzt();
    }
  } catch (e) { aus.fehler = String(e); }
  return aus;
})()
"""

# Startansicht ansteuern: der erste Eintrag der Ansichtsliste ist „Heute" (Hub). Damit ist
# die Messung unabhängig davon, in welche Ansicht der jeweilige Spielstand bootet.
STARTANSICHT = r"""
(() => { try {
  const liste = (typeof UI !== 'undefined' && UI.app && UI.app.liste) ? UI.app.liste() : [];
  if (!liste.length) return null;
  const heu = liste.find(a => a.name === 'heute') || liste[0];
  UI.app.ansicht(heu.name);
  return heu.name;
} catch (e) { return 'Fehler: ' + e; } })()
"""

# Eine bestimmte Ansicht zeigen (fuer die Bilder je Ansicht, siehe --bild-ansichten).
ANSICHT_ZEIGEN = r"""
(() => { try {
  if (typeof UI === 'undefined' || !UI.app) return null;
  UI.app.ansicht(%s);
  return UI.app.aktuell;
} catch (e) { return 'Fehler: ' + e; } })()
"""

# Fuer die Ziehprobe: Werkzeug waehlen und die Bildschirmpunkte zweier Geraete holen.
ZIEH_VORBEREITEN = r"""
(() => {
  const svg = document.querySelector('.lb-svg');
  const rb = svg.getBoundingClientRect();
  const ids = Object.keys(UI.labor.netz.geraete);
  const punkt = id => { const b = UI.labor.bildschirm(id);
    return b ? {x: Math.round(rb.left + b.x), y: Math.round(rb.top + b.y)} : null; };
  UI.labor.werkzeug('kabel');
  const a = ids.find(i => punkt(i)), b = ids.filter(i => i !== a).find(i => punkt(i));
  return {a: a, b: b, pa: punkt(a), pb: punkt(b),
          kabelVorher: UI.labor.netz.kabel.length,
          werkzeug: UI.labor.werkzeugName};
})()
"""

ZIEH_ERGEBNIS = r"""
(() => {
  const k = UI.labor.netz.kabel;
  const ids = Object.keys(UI.labor.netz.geraete);
  return {kabelNachher: k.length,
          kabel: k.map(x => x.a.geraet + ':' + x.a.port + '↔' + x.b.geraet + ':' + x.b.port),
          geraete: ids.length};
})()
"""

# ---------------------------------------------------------------- die Messung
MESSUNG = r"""
(() => {
  const R = n => Math.round(n);
  /* Der BILDSCHIRM ist das Maß, das der Nutzer sieht (visualViewport = Größe der
     Geräteanzeige in CSS-Pixeln). `innerWidth` ist nur das Layout-Fenster: bei
     „shrink to fit" kann es größer sein als der Bildschirm — dann ist die Oberfläche
     breiter als das Telefon und rechts wird abgeschnitten. Gemessen 06.10.2026 an der
     alten Fassung: innerWidth 494 auf einem 412er Bildschirm. */
  const vv = window.visualViewport;
  const bsw = vv ? R(vv.width) : screen.width;
  const bsh = vv ? R(vv.height) : screen.height;
  const kb = e => { const b = e.getBoundingClientRect();
    return {x: R(b.x), y: R(b.y), w: R(b.width), h: R(b.height), rechts: R(b.right), unten: R(b.bottom)}; };
  const r = s => { for (const e of document.querySelectorAll(s)) if (sichtbar(e)) return kb(e);
    return null; };
  const kl = e => (e.getAttribute('class') || '').trim();
  const txt = e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const sichtbar = e => {
    if (!e || e.nodeType !== 1) return false;
    const b = e.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return false;
    for (let k = e; k && k.nodeType === 1; k = k.parentElement) {
      const st = getComputedStyle(k);
      if (st.display === 'none' || st.visibility === 'hidden' || st.visibility === 'collapse') return false;
      if (parseFloat(st.opacity) === 0) return false;
    }
    return true;
  };
  const pfad = e => { const t = [];
    for (let k = e; k && k.nodeType === 1 && t.length < 4; k = k.parentElement) {
      let s = k.tagName.toLowerCase();
      if (k.id) s += '#' + k.id;
      const c = kl(k).split(/\s+/).filter(Boolean).slice(0, 2);
      if (c.length) s += '.' + c.join('.');
      t.unshift(s);
    }
    return t.join('>');
  };

  /* Feste Auswahl für „abgeschnittener Text“ und „ragt aus dem Bildschirm“:
     Kopfzeile, Kopf-Knöpfe, Navigationsspalte, Auftrag, Werkzeugknöpfe, Zoom-Knopf,
     Dock-Reiter, Gerätekategorien. */
  const AUSWAHL = {
    kopf: ['.kopf', '.kopf-marke', '.marke-name', '.marke-version', '.kopf-werte', '.wert', '.wert-zahl', '.kopf-knoepfe', '.kopf-knopf'],
    navigation: ['.dock', '.dock-knopf', '.dock-text', '.dock-zahl'],
    auftrag: ['.lb-auftrag', '.lb-auftrag-standard', '.auftrag-sandbox', '.as-text', '.as-text strong', '.as-text span'],
    werkzeuge: ['.lb-wz', '.lb-wz-taste', '.lb-ansicht', '.lb-ansicht-text', '.lb-knopf', '.lb-zoomtext', '.lb-hinweis'],
    dockreiter: ['.lb-dock', '.lb-dock-reiter', '.lb-dock-tab', '.lb-dock-titel', '.lb-dock-einklappen'],
    geraete: ['.lb-geraete', '.lb-geraete-titel', '.pa-kat', '.pa-fach', '.pa-teil', '.pa-text b', '.pa-text small', '.pa-zu']
  };
  const abgeschnitten = [], ausserhalb = [];
  for (const bereich of Object.keys(AUSWAHL)) {
    for (const s of AUSWAHL[bereich]) {
      for (const e of document.querySelectorAll(s)) {
        if (!sichtbar(e)) continue;
        const b = e.getBoundingClientRect();
        if (e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 2) {
          abgeschnitten.push({bereich: bereich, s: s, klasse: kl(e), pfad: pfad(e),
                              platz: e.clientWidth, braucht: e.scrollWidth, text: txt(e)});
        }
        if (e.clientWidth > 0 && (b.right > bsw + 2 || b.left < -2 ||
                                  b.bottom > bsh + 2 || b.top < -2)) {
          ausserhalb.push({bereich: bereich, s: s, klasse: kl(e), pfad: pfad(e), links: R(b.left),
                           rechts: R(b.right), oben: R(b.top), unten: R(b.bottom),
                           bildschirm: [bsw, bsh], text: txt(e)});
        }
      }
    }
  }

  /* Leisten: die beiden schwebenden Leisten des Labors und — falls die Android-Schicht
     eigene Behälter baut — alles, was nach Werkzeugleiste aussieht (nl-*). */
  const leisten = [], gesehen = new Set();
  const LEISTEN_S = ['.lb-leiste-oben', '.lb-leiste-unten', '.nl-werkzeuge', '.nl-werkzeugleiste',
                     '.nl-leiste', '.nl-leiste-oben', '.nl-leiste-unten', '.nl-schwebend'];
  for (const s of LEISTEN_S) {
    for (const e of document.querySelectorAll(s)) {
      if (gesehen.has(e) || !sichtbar(e)) continue;
      gesehen.add(e);
      const teile = [...e.children].filter(sichtbar).map(k => k.getBoundingClientRect());
      /* Zeilen zählen an den KNÖPFEN (die innersten Bedienelemente): eine Gruppe mit drei
         Werkzeugen, die selbst umbricht, belegt mehr Zeilen als die Gruppe breit ist. */
      const knoepfeIm = [...e.querySelectorAll('button, [role="button"]')].filter(sichtbar)
        .map(k => k.getBoundingClientRect());
      const grund = knoepfeIm.length ? knoepfeIm : teile;
      leisten.push({s: s, klasse: kl(e), r: kb(e), teile: teile.length,
                    zeilen: new Set(grund.map(k => R(k.top))).size,
                    zeilenGruppen: new Set(teile.map(k => R(k.top))).size,
                    breite: R(grund.reduce((a, k) => a + k.width, 0)),
                    gruppen: e.querySelectorAll('.lb-gruppe').length});
    }
  }
  const hatKlasse = (l, n) => l.klasse.split(/\s+/).indexOf(n) >= 0;
  const werkzeugleiste = leisten.find(l => hatKlasse(l, 'lb-leiste-oben'))
                      || leisten.find(l => /nl-werkzeug/.test(l.klasse) || /nl-werkzeug/.test(l.s))
                      || leisten.find(l => /nl-leiste/.test(l.klasse))
                      || null;

  /* Schwebende Behälter für die Kollisionsprüfung (Leisten über Geräten).
     Die beiden schwebenden Knöpfe der Android-Schicht (.nl-fab) decken ebenfalls Fläche
     ab — sie zählen mit (Hinweis von „mobil-flaeche", 06.10.2026). */
  const schwebend = [];
  for (const s of ['.lb-leiste-oben', '.lb-leiste-unten', '.nl-schwebend', '.nl-leiste', '.nl-fab']) {
    for (const e of document.querySelectorAll(s)) {
      if (!sichtbar(e) || schwebend.some(x => x.el === e)) continue;
      schwebend.push({el: e, klasse: kl(e), r: kb(e)});
    }
  }
  const leinwand = r('.lb-leinwand');
  const geraeteRechtecke = [...document.querySelectorAll('.lb-svg .ger')].filter(sichtbar).map(kb);
  let verdeckt = 0;
  const kollision = [];
  if (leinwand) {
    for (const l of schwebend) {
      const x = Math.max(0, Math.min(leinwand.x + leinwand.w, l.r.x + l.r.w) - Math.max(leinwand.x, l.r.x));
      const y = Math.max(0, Math.min(leinwand.y + leinwand.h, l.r.y + l.r.h) - Math.max(leinwand.y, l.r.y));
      verdeckt += x * y;
    }
    geraeteRechtecke.forEach((g, i) => {
      for (const l of schwebend) {
        const x = Math.max(0, Math.min(g.x + g.w, l.r.x + l.r.w) - Math.max(g.x, l.r.x));
        const y = Math.max(0, Math.min(g.y + g.h, l.r.y + l.r.h) - Math.max(g.y, l.r.y));
        if (x > 0 && y > 0) {
          kollision.push({geraet: i, leiste: l.klasse, flaeche: R(x * y),
                          anteil: g.w * g.h > 0 ? +(x * y / (g.w * g.h)).toFixed(2) : null});
        }
      }
    });
  }

  /* Trefferflächen: alle sichtbaren Knöpfe, kleinstes Maß, Zahl unter 44×44 px. */
  const knoepfe = [];
  for (const e of document.querySelectorAll('button, [role="button"]')) {
    if (!sichtbar(e)) continue;
    const b = e.getBoundingClientRect();
    knoepfe.push({w: R(b.width), h: R(b.height), klasse: kl(e), pfad: pfad(e),
                  aus: !!e.disabled, text: txt(e)});
  }
  const unter44 = knoepfe.filter(k => k.w < 44 || k.h < 44);
  const nachMin = knoepfe.slice().sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h));
  const nachBreite = knoepfe.slice().sort((a, b) => a.w - b.w);
  const nachHoehe = knoepfe.slice().sort((a, b) => a.h - b.h);

  /* Erreichbarkeit der Bediengruppen im GEMESSENEN Zustand. Ein geschlossenes Blatt
     versteckt seine Reiter legitim — deshalb sind das Zahlen, kein Urteil. Ob es einen
     Öffner gibt, prüft --bedienprobe durch Anklicken. */
  const GRUPPEN = {navigation: '.dock-knopf', dockReiter: '.lb-dock-tab', geraete: '.pa-kat',
                   werkzeuge: '.lb-wz', ansicht: '.lb-ansicht', zoom: '.lb-zoomtext',
                   kopfknoepfe: '.kopf-knopf', geraeteteile: '.pa-teil'};
  const erreichbar = {};
  for (const g of Object.keys(GRUPPEN)) {
    const da = [...document.querySelectorAll(GRUPPEN[g])];
    const e = {da: da.length, unsichtbar: 0, draussen: 0, teilweise: 0, zuKlein: 0};
    for (const el of da) {
      if (!sichtbar(el)) { e.unsichtbar++; continue; }
      const b = el.getBoundingClientRect();
      const ganzDraussen = b.right <= 0 || b.left >= innerWidth || b.bottom <= 0 || b.top >= innerHeight;
      const teils = b.left < 0 || b.right > innerWidth || b.top < 0 || b.bottom > innerHeight;
      if (ganzDraussen) e.draussen++; else if (teils) e.teilweise++;
      if (b.width < 44 || b.height < 44) e.zuKlein++;
    }
    erreichbar[g] = e;
  }

  /* Sichere Ränder: erst eigene Tokens (--nl-safe-*), sonst env(safe-area-inset-*) über
     ein Hilfselement. In einem Kopfloser-Browser ohne Aussparung sind die env-Werte 0 —
     gemessen wird also, was ankommt, nicht was ankommen sollte. */
  const wurzel = getComputedStyle(document.documentElement);
  const nlSafe = {};
  for (const n of ['oben', 'unten', 'links', 'rechts']) {
    const v = wurzel.getPropertyValue('--nl-safe-' + n).trim();
    if (v) nlSafe[n] = v;
  }
  const hilfe = document.createElement('div');
  hilfe.setAttribute('style', 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);' +
    'padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)');
  document.documentElement.appendChild(hilfe);
  const hs = getComputedStyle(hilfe);
  const envSafe = {oben: hs.paddingTop, rechts: hs.paddingRight, unten: hs.paddingBottom, links: hs.paddingLeft};
  hilfe.remove();

  /* Nur die SICHTBARE Zeichenfläche: in der Startansicht liegt die (versteckte) Laborfläche
     noch im DOM — ihr Zoom darf nicht in die Startansicht-Messung lecken. */
  const svg = [...document.querySelectorAll('.lb-svg')].filter(sichtbar)[0] || null;
  const zoomG = svg ? svg.querySelector('g[transform*="scale"]') : null;
  const m = zoomG ? /scale\(([\d.]+)\)/.exec(zoomG.getAttribute('transform') || '') : null;
  const zoomKnopf = document.querySelector('.lb-zoomtext');
  const zkb = zoomKnopf ? zoomKnopf.getBoundingClientRect() : null;

  const meta = document.querySelector('meta[name="viewport"]');
  /* Von mobil.js ergänzte Elemente: liegen sie außerhalb der Telefon-Stufe als halbfertige
     Reste herum? (Frage des Leads und von „mobil-flaeche", 06.10.2026) */
  const mobilElemente = ['.nl-fab-geraete', '.nl-fab-dock', '.nl-fab', '.nl-mehr', '.nl-menue',
                         '.nl-griff'].map(s => {
    const alle = [...document.querySelectorAll(s)];
    const sicht = alle.filter(sichtbar);
    const st = alle.length ? getComputedStyle(alle[0]) : null;
    const r0 = alle.length ? kb(alle[0]) : null;
    /* Wer liegt an der Mitte des Elements oben? Nur so ist belegt, ob ein Rest wirklich
       sichtbar/anklickbar ist oder nur im DOM steht und verdeckt wird. Geprüft werden
       fünf Punkte (vier Ecken 2 px eingerückt + Mitte). */
    let treffer = null, obenKlasse = null;
    const erstes = sicht.length ? sicht[0] : alle[0];
    if (erstes) {
      const rb = erstes.getBoundingClientRect();
      if (rb.width >= 4 && rb.height >= 4) {
        const punkte = [];
        for (const dx of [2, rb.width / 2, rb.width - 2]) {
          for (const dy of [2, rb.height / 2, rb.height - 2]) punkte.push([dx, dy]);
        }
        let selbst = 0, mitte = null;
        for (const [dx, dy] of punkte) {
          const x = Math.min(bsw - 1, Math.max(0, rb.left + dx));
          const y = Math.min(bsh - 1, Math.max(0, rb.top + dy));
          const oben = document.elementFromPoint(x, y);
          if (oben && (oben === erstes || erstes.contains(oben))) selbst++;
          if (dx === rb.width / 2 && dy === rb.height / 2) mitte = oben;
        }
        treffer = {selbst: selbst, von: punkte.length};
        obenKlasse = mitte ? (mitte === erstes || erstes.contains(mitte) ? 'das Element selbst' : pfad(mitte)) : null;
      }
    }
    return {s: s, da: alle.length, sichtbar: sicht.length,
            r: sicht.length ? kb(sicht[0]) : r0,
            display: st ? st.display : null, visibility: st ? st.visibility : null,
            opacity: st ? st.opacity : null, treffer: treffer, obenKlasse: obenKlasse,
            ueberLeinwand: !!(sicht.length && leinwand && r0 &&
              Math.max(0, Math.min(leinwand.x + leinwand.w, r0.rechts) - Math.max(leinwand.x, r0.x)) > 0 &&
              Math.max(0, Math.min(leinwand.y + leinwand.h, r0.unten) - Math.max(leinwand.y, r0.y)) > 0)};
  });
  return {
    groesse: {w: innerWidth, h: innerHeight, dpr: devicePixelRatio},
    bildschirm: {w: bsw, h: bsh},
    // Kommt die Bildschirmnachstellung wirklich an? (Gemessen 06.10.2026 an der alten
    // Fassung: im Hochformat meldete innerWidth 494 auf einem 412er Bildschirm.)
    fenster: {outer: {w: outerWidth, h: outerHeight},
              screen: {w: screen.width, h: screen.height,
                       availW: screen.availWidth, availH: screen.availHeight},
              dpr: devicePixelRatio,
              visual: vv ? {w: +vv.width.toFixed(2), h: +vv.height.toFixed(2),
                            scale: +vv.scale.toFixed(4)} : null,
              meta: meta ? meta.getAttribute('content') : null},
    // Welche Breite hat die Seite wirklich? (innerWidth kann bei „shrink to fit" größer sein
    // als der Bildschirm — dann ist die Oberfläche breiter als das Telefon.)
    breiten: {inner: innerWidth, docClient: document.documentElement.clientWidth,
              docScroll: document.documentElement.scrollWidth,
              body: document.body.clientWidth, bodyScroll: document.body.scrollWidth,
              app: r('#app'), appBox: r('.app'), bildschirm: vv ? +vv.width.toFixed(1) : screen.width},
    orientierung: {portrait: matchMedia('(orientation: portrait)').matches,
                   landscape: matchMedia('(orientation: landscape)').matches},
    grob: matchMedia('(pointer: coarse)').matches,
    dunkel: matchMedia('(prefers-color-scheme: dark)').matches,
    thema: document.documentElement.dataset.theme || '(aus dem System)',
    farben: {hintergrund: getComputedStyle(document.body).backgroundColor,
             text: getComputedStyle(document.body).color,
             bgToken: wurzel.getPropertyValue('--bg').trim()},
    beruehrung: navigator.maxTouchPoints,
    ueberlauf: {x: document.documentElement.scrollWidth - innerWidth,
                y: document.documentElement.scrollHeight - innerHeight},
    // Überlauf gegen den BILDSCHIRM: genau das sieht der Nutzer (rechts abgeschnitten).
    ueberlaufBildschirm: {x: document.documentElement.scrollWidth - bsw,
                          y: document.documentElement.scrollHeight - bsh},
    kopf: r('.kopf'), labor: r('.labor'), geraete: r('.lb-geraete'), mitte: r('.lb-mitte'),
    leinwand: leinwand, svg: r('.lb-svg'), auftrag: r('.lb-auftrag'),
    lbDock: r('.lb-dock'), nav: r('.dock'), flaeche: r('.flaeche'),
    leisten: leisten, werkzeugleiste: werkzeugleiste,
    gruppen: (document.querySelector('.lb-leiste-oben') || document).querySelectorAll('.lb-gruppe').length,
    flaecheAnteil: leinwand ? +(leinwand.w / bsw).toFixed(4) : null,
    flaecheAnteilFenster: leinwand ? +(leinwand.w / innerWidth).toFixed(4) : null,
    toteFlaecheRechts: leinwand ? Math.max(0, bsw - (leinwand.x + leinwand.w)) : null,
    toteFlaecheRechtsFenster: leinwand ? Math.max(0, innerWidth - (leinwand.x + leinwand.w)) : null,
    toteFlaecheLinks: leinwand ? Math.max(0, leinwand.x) : null,
    toteFlaecheUnten: leinwand ? Math.max(0, bsh - (leinwand.y + leinwand.h)) : null,
    verdecktAnteil: leinwand && leinwand.w * leinwand.h > 0 ? +(verdeckt / (leinwand.w * leinwand.h)).toFixed(3) : null,
    kollision: kollision.slice(0, 24),
    kollisionZahl: new Set(kollision.map(k => k.geraet)).size,
    zoom: m ? +m[1] : null,
    zoomKnopf: zkb ? {w: Math.round(zkb.width), h: Math.round(zkb.height)} : null,
    geraeteGezeichnet: svg ? svg.querySelectorAll('.ger').length : -1,
    abgeschnitten: abgeschnitten,
    ausserhalb: ausserhalb,
    kleinsteTrefferflaeche: nachMin[0] || null,
    kleinsteBreite: nachBreite[0] || null,
    kleinsteHoehe: nachHoehe[0] || null,
    bedienbar: {gesamt: knoepfe.length, unter44: unter44.length, liste: unter44.slice(0, 14)},
    erreichbar: erreichbar,
    safeArea: {nl: nlSafe, env: envSafe},
    mobilElemente: mobilElemente,
    // Prueft die Android-Anpassung: der Leisten-Modus darf nicht greifen (mobil.js).
    leiste: (() => { try {
      const vor = UI.modus(); UI.modus('leiste');
      const nach = UI.modus(); UI.modus(vor);
      return {vor: vor, nach: nach};
    } catch (e) { return {fehler: String(e)}; } })(),
    jsFehler: (window.__nlFehler || []).slice(0, 5),
    konsoleFehler: (window.__nlKonsole || []).slice(0, 5),
    mobil: window.__nlMobil || null
  };
})()
"""

# ---------------------------------------------------------------- Bedienprobe
# Klickt Navigation, Gerätekategorien und Dock-Reiter wirklich an. Damit lässt sich
# „unerreichbar“ belegen, ohne zu raten: ein geschlossenes Blatt ist kein Befund, wenn
# ein sichtbarer Knopf es öffnet und die Reiter danach da sind.
BEDIENUNG = r"""
(async () => {
  const R = n => Math.round(n);
  const kb = e => { const b = e.getBoundingClientRect();
    return {x: R(b.x), y: R(b.y), w: R(b.width), h: R(b.height)}; };
  const kl = e => (e.getAttribute('class') || '').trim();
  const txt = e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
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
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const alle = () => [...document.querySelectorAll('button, [role="button"]')];
  const vv = window.visualViewport;
  const bsw = vv ? R(vv.width) : screen.width;
  const bsh = vv ? R(vv.height) : screen.height;
  const drin = b => b.left >= -2 && b.right <= bsw + 2 && b.top >= -2 && b.bottom <= bsh + 2;
  const aus = {ansichten: [], kategorien: [], reiter: [], oeffnerGeraete: [], oeffnerDock: [], fehler: null};
  try {
    if (typeof UI === 'undefined' || !UI.app) { aus.fehler = 'kein UI'; return aus; }

    /* A) Navigation: jede registrierte Ansicht über einen SICHTBAREN Knopf erreichen. */
    const liste = (UI.app.liste ? UI.app.liste() : []);
    for (const a of liste) {
      const kand = [...document.querySelectorAll('[data-ansicht="' + a.name + '"]')].filter(sichtbar)
        .concat(alle().filter(b => sichtbar(b) &&
          (txt(b) === a.titel || (b.getAttribute('aria-label') || '').trim() === a.titel)));
      const b = kand[0] || null;
      const e = {ziel: a.name, titel: a.titel, knopf: b ? kl(b) : null, masse: b ? kb(b) : null};
      if (!b) { e.stand = 'kein sichtbarer Knopf'; aus.ansichten.push(e); continue; }
      e.drin = drin(b.getBoundingClientRect());
      e.zuKlein = b.getBoundingClientRect().width < 44 || b.getBoundingClientRect().height < 44;
      b.click();
      await warte(340);
      const beh = document.querySelector('.ansicht[data-ansicht="' + a.name + '"]');
      e.aktiv = UI.app.aktuell;
      e.behaelter = beh ? sichtbar(beh) : false;
      e.masseBehaelter = beh ? kb(beh) : null;
      e.stand = (UI.app.aktuell === a.name && (!beh || sichtbar(beh))) ? 'ok' : 'nicht erreicht';
      aus.ansichten.push(e);
    }

    /* Zurück ins Labor: Gerätefächer und Dock gibt es nur in der Labor-Ansicht. */
    const lb0 = [...document.querySelectorAll('[data-ansicht="labor"]')].filter(sichtbar)[0];
    if (lb0) { lb0.click(); await warte(480); }
    aus.imLabor = (UI.app.aktuell === 'labor');

    /* B) Gerätekategorien: erst sichtbare Kategorien, sonst einen Öffner suchen und klicken.
       Die Android-Schicht baut dafür einen „+ Gerät"-Knopf (.nl-fab-geraete) — der wird
       zuerst genommen, danach erst geraten. */
    let kats = () => [...document.querySelectorAll('.pa-kat')].filter(sichtbar);
    let kk = kats();
    let oeffnerG = null;
    if (kk.length === 0) {
      const kand = [...document.querySelectorAll('.nl-fab-geraete, [data-blatt="geraete"]')].filter(sichtbar)
        .concat(alle().filter(b => sichtbar(b) && !b.dataset.ansicht &&
          !b.classList.contains('dock-knopf') &&
          /(^|\s)\+|^gerät|^geraet|kategorie|baustein/i.test(txt(b) + ' ' + (b.title || ''))));
      aus.oeffnerGeraete = kand.slice(0, 6).map(b => ({klasse: kl(b), masse: kb(b), text: txt(b)}));
      for (const b of kand.slice(0, 3)) {
        b.click();
        await warte(380);
        kk = kats();
        if (kk.length) { oeffnerG = b; break; }
      }
    }
    aus.kategorienSichtbar = kk.length;
    aus.geraeteBlattOffen = !!document.documentElement.classList.contains('nl-geraete-auf');
    if (oeffnerG) aus.oeffnerGeraeteErfolg = {klasse: kl(oeffnerG), masse: kb(oeffnerG)};
    for (const k of kk) {
      const e = {name: txt(k), masse: kb(k)};
      k.click();
      await warte(340);
      e.faecher = [...document.querySelectorAll('.pa-fach')].filter(sichtbar).length;
      e.teile = [...document.querySelectorAll('.pa-teil')].filter(sichtbar).length;
      e.stand = (e.faecher > 0 || e.teile > 0) ? 'ok' : 'kein Fach geöffnet';
      /* Das Fach öffnet nach oben — passt es noch auf den Bildschirm? */
      const fach = [...document.querySelectorAll('.pa-fach')].filter(sichtbar)[0];
      e.fach = fach ? {masse: kb(fach), drin: drin(fach.getBoundingClientRect())} : null;
      e.teileAusserhalb = [...document.querySelectorAll('.pa-teil')].filter(sichtbar)
        .filter(t => !drin(t.getBoundingClientRect())).length;
      e.teileZuKlein = [...document.querySelectorAll('.pa-teil')].filter(sichtbar)
        .filter(t => { const b = t.getBoundingClientRect(); return b.width < 44 || b.height < 44; }).length;
      aus.kategorien.push(e);
      const zu = [...document.querySelectorAll('.pa-zu')].filter(sichtbar)[0];
      if (zu) { zu.click(); await warte(220); } else { k.click(); await warte(220); }
    }
    if (oeffnerG) { oeffnerG.click(); await warte(300); }   /* Blatt wieder zu */

    /* C) Dock-Reiter: erst zählen, sonst über den Dock-Knopf (.nl-fab-dock) öffnen,
       dann jeden Reiter anklicken und nachsehen, ob Inhalt kommt. */
    let reiter = () => [...document.querySelectorAll('.lb-dock-tab')].filter(sichtbar);
    let rs = reiter();
    aus.reiterVorher = rs.length;
    let oeffnerD = null;
    if (rs.length === 0) {
      const kand = [...document.querySelectorAll('.nl-fab-dock, .nl-griff')].filter(sichtbar)
        .concat(alle().filter(b => sichtbar(b) && !b.dataset.ansicht &&
          /dock|reiter|inspektor/i.test(txt(b) + ' ' + (b.title || ''))));
      aus.oeffnerDock = kand.slice(0, 6).map(b => ({klasse: kl(b), masse: kb(b), text: txt(b)}));
      for (const b of kand.slice(0, 3)) {
        b.click();
        await warte(420);
        rs = reiter();
        if (rs.length) { oeffnerD = b; break; }
      }
    }
    aus.reiterNachOeffnen = rs.length;
    if (oeffnerD) aus.oeffnerDockErfolg = {klasse: kl(oeffnerD), masse: kb(oeffnerD)};
    const dockEl = document.querySelector('.lb-dock');
    aus.dockOffen = dockEl ? sichtbar(dockEl) : false;
    aus.dockMasse = dockEl && sichtbar(dockEl) ? kb(dockEl) : null;
    for (const t of rs) {
      const e = {name: txt(t), masse: kb(t)};
      t.click();
      await warte(320);
      e.inhalt = [...document.querySelectorAll('.lb-dock-inhalt > *')].filter(sichtbar).length;
      e.aktiv = t.getAttribute('aria-selected') === 'true' || t.classList.contains('an');
      e.stand = (e.inhalt > 0 && e.aktiv) ? 'ok' : 'kein Inhalt';
      e.kinder = [...document.querySelectorAll('.lb-dock-inhalt > *')].map(k => ({
        klasse: kl(k), versteckt: k.hasAttribute('hidden'), sichtbar: sichtbar(k), masse: kb(k)}));
      aus.reiter.push(e);
      e.masseInhalt = (() => { const i = [...document.querySelectorAll('.lb-dock-inhalt > *')].filter(sichtbar)[0];
        return i ? kb(i) : null; })();
    }
    if (oeffnerD) { oeffnerD.click(); await warte(320); }    /* Blatt wieder zu */

    /* D) Kopfzeilen-Menü: die Knöpfe, die dort hinein wandern, müssen erreichbar sein. */
    const mehr = alle().filter(sichtbar).find(b => b.classList.contains('nl-mehr') ||
      (/mehr/i.test(txt(b)) && b.getAttribute('aria-haspopup') === 'menu'));
    aus.mehrKnopf = mehr ? {klasse: kl(mehr), masse: kb(mehr)} : null;
    if (mehr) {
      mehr.click();
      await warte(380);
      const menue = [...document.querySelectorAll('.nl-menue')].filter(sichtbar)[0] || null;
      aus.menue = menue ? {masse: kb(menue), drin: drin(menue.getBoundingClientRect())} : null;
      aus.menuePunkte = [...document.querySelectorAll('.nl-menue .menue-punkt')].filter(sichtbar).map(k => {
        const b = k.getBoundingClientRect();
        return {text: txt(k), masse: kb(k), drin: drin(b), zuKlein: b.width < 44 || b.height < 44};
      });
      mehr.click();
      await warte(260);
    }

    /* Labor wieder herstellen, damit nachfolgende Messungen denselben Zustand sehen. */
    const lb = [...document.querySelectorAll('[data-ansicht="labor"]')].filter(sichtbar)[0];
    if (lb) { lb.click(); await warte(320); }
  } catch (e) { aus.fehler = String(e); }
  return aus;
})()
"""

# ---------------------------------------------------------------- Drehprobe
DREH_STAND = r"""
(() => { try {
  window.__nlDreh = {marke: 'dreh-' + Date.now(),
                     kabel: UI.labor.netz.kabel.length,
                     geraete: Object.keys(UI.labor.netz.geraete).length,
                     ansicht: UI.app.aktuell};
  return window.__nlDreh;
} catch (e) { return {fehler: String(e)}; } })()
"""

DREH_NACH = r"""
(() => {
  const d = window.__nlDreh || null;
  let kabel = null, geraete = null, ansicht = null;
  try { kabel = UI.labor.netz.kabel.length;
        geraete = Object.keys(UI.labor.netz.geraete).length;
        ansicht = UI.app.aktuell; } catch (e) { /* nach einem Neuladen gibt es das nicht */ }
  const lw = document.querySelector('.lb-leinwand');
  const b = lw ? lw.getBoundingClientRect() : null;
  return {markeUeberlebt: !!d, marke: d ? d.marke : null,
          kabelVorher: d ? d.kabel : null, kabelNachher: kabel,
          geraeteVorher: d ? d.geraete : null, geraeteNachher: geraete,
          ansichtVorher: d ? d.ansicht : null, ansichtNachher: ansicht,
          leinwandNachher: b ? {w: Math.round(b.width), h: Math.round(b.height)} : null,
          groesse: {w: innerWidth, h: innerHeight},
          jsFehler: (window.__nlFehler || []).slice(0, 3)};
})()
"""


# ---------------------------------------------------------------- Hilfsmittel

def arbeitsordner(prefix: str) -> Path:
    """Einen Arbeitsordner anlegen, der auch in einer Werkzeug-Sandbox beschreibbar bleibt.

    Gemessen am 06.10.2026 (dieses Werkzeug lief zum ersten Mal unter der Sandbox des
    Werkzeugs, workspace-write): `tempfile.mkdtemp` war unbrauchbar. Der Grund steht in
    `tempfile.py`, Zeile „_os.mkdir(file, 0o700)": Ein Ordner mit dem Modus 0o700 bekommt
    unter Windows einen privaten Sicherheitsdeskriptor. Danach ist er für jeden weiteren
    Zugriff gesperrt — Schreiben, Auflisten, Löschen, sogar `icacls /reset` (drei Proben:
    `os.mkdir(p, 0o700)` → PermissionError beim Schreiben, `os.mkdir(p, 0o777)` und
    `os.mkdir(p)` → in Ordnung).

    Also kein mkdtemp: ein gewöhnlicher Ordner unter `android/bau/tmp` (von .gitignore
    erfasst), mit eindeutigem Namen und ohne 0o700. Aufgeräumt wird in `main` per
    `shutil.rmtree` — bei diesen Ordnern greift es, bei mkdtemp-Ordnern nicht.
    """
    basis = HIER / "bau" / "tmp"
    basis.mkdir(parents=True, exist_ok=True)
    for lauf in range(1000):
        d = basis / f"{prefix}{os.getpid()}-{lauf}"
        try:
            d.mkdir()
            return d
        except FileExistsError:
            continue
    raise RuntimeError(f"kein freier Arbeitsordner unter {basis}")


def freier_port() -> int:
    """Einen freien Steuerport wählen (--port 0).

    Grund (gemessen 06.10.2026): Zwei gleichzeitige Läufe auf demselben Port verbinden sich
    mit demselben Browser; beendet der eine seinen Browser, bricht der andere mit
    ConnectionResetError ab. Der Standardport bleibt 9344, `--port 0` sucht sich einen
    freien — für gleichzeitige Läufe mehrerer Werkzeuge.
    """
    import socket
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
    finally:
        s.close()


def zeile(name, wert):
    print(f"  {name:<26} {wert}")


def masse(geraet: str, ausrichtung: str):
    """Maße eines Geräteprofils in der gewünschten Ausrichtung (quer = getauscht)."""
    b, h, d, _ = GERAETE[geraet]
    if ausrichtung == "quer":
        b, h = h, b
    return b, h, d


def touch(ws, art, punkte):
    """Eine Berührung senden (touchStart/touchMove/touchEnd) — Chrome macht daraus Zeiger-Ereignisse."""
    ws.rufen("Input.dispatchTouchEvent",
             {"type": art, "touchPoints": [{"x": round(x), "y": round(y), "id": i}
                                           for i, (x, y) in enumerate(punkte)]})


def ziehprobe(ws):
    """Mit dem FINGER ein Kabel ziehen — die Kernhandlung des Spiels.

    Gibt (ergebnis, fehlertext) zurück. Gemessen wird, ob am Ende wirklich ein Kabel
    zwischen zwei Geräten steht; ein fehlgeschlagener Zug ist ein Befund, kein Absturz.
    """
    r = ws.rufen("Runtime.evaluate", {"expression": ZIEH_VORBEREITEN, "returnByValue": True})
    if "exceptionDetails" in r:
        return None, r["exceptionDetails"].get("text")
    v = r["result"]["value"]
    if not v.get("pa") or not v.get("pb"):
        return None, "kein Gerät auf der Fläche gefunden"
    ax, ay = v["pa"]["x"], v["pa"]["y"]
    bx, by = v["pb"]["x"], v["pb"]["y"]
    touch(ws, "touchStart", [(ax, ay)])
    time.sleep(0.12)
    schritte = 8
    for i in range(1, schritte + 1):
        touch(ws, "touchMove", [(ax + (bx - ax) * i / schritte, ay + (by - ay) * i / schritte)])
        time.sleep(0.05)
    time.sleep(0.12)
    touch(ws, "touchEnd", [])
    time.sleep(0.6)
    r = ws.rufen("Runtime.evaluate", {"expression": ZIEH_ERGEBNIS, "returnByValue": True})
    if "exceptionDetails" in r:
        return None, r["exceptionDetails"].get("text")
    e = r["result"]["value"]
    e["von"] = v["a"]
    e["nach"] = v["b"]
    e["kabelVorher"] = v["kabelVorher"]
    e["gezogen"] = f"({v['pa']['x']},{v['pa']['y']}) → ({v['pb']['x']},{v['pb']['y']})"
    return e, None


def schuss(ws, ziel: Path):
    """Bildschirmfoto schreiben."""
    shot = ws.rufen("Page.captureScreenshot", {"format": "png"})
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_bytes(base64.b64decode(shot["data"]))
    return ziel


def rufe(ws, ausdruck, warten=False):
    """Runtime.evaluate mit Fehlerbehandlung: gibt (wert, fehlertext) zurück."""
    params = {"expression": ausdruck, "returnByValue": True}
    if warten:
        params["awaitPromise"] = True
    r = ws.rufen("Runtime.evaluate", params)
    if "exceptionDetails" in r:
        d = r["exceptionDetails"]
        return None, (d.get("exception", {}) or {}).get("description") or d.get("text") or "?"
    return r.get("result", {}).get("value"), None


def setze_masse(ws, breite, hoehe, dpr, ausrichtung, ohne_ausrichtung=False):
    """Bildschirm nachstellen — mit passender Bildschirmausrichtung und Winkel."""
    art = "portraitPrimary" if ausrichtung == "hoch" else "landscapePrimary"
    winkel = 0 if ausrichtung == "hoch" else 90
    auftrag = {"width": breite, "height": hoehe, "deviceScaleFactor": dpr, "mobile": True,
               "screenWidth": breite, "screenHeight": hoehe}
    if not ohne_ausrichtung:
        auftrag["screenOrientation"] = {"type": art, "angle": winkel}
    ws.rufen("Emulation.setDeviceMetricsOverride", auftrag)


def warte_auf_spiel(ws, sekunden=60.0):
    """Warten, bis #app wirklich Inhalt hat."""
    ende = time.time() + sekunden
    while time.time() < ende:
        wert, _ = rufe(ws, "document.getElementById('app')?.children.length || 0")
        if (wert or 0) > 0:
            return True
        time.sleep(0.5)
    return False


# ---------------------------------------------------------------- Messprofile

def baue_profile(a):
    """Aus den Optionen die Liste der Messprofile bauen (ein Profil oder ein Lauf)."""
    geraete = [x.strip() for x in (a.geraet or "").split(",") if x.strip()]
    for g in geraete:
        if g not in GERAETE:
            raise SystemExit(f"FEHLER: unbekanntes Gerät '{g}' — erlaubt: {', '.join(GERAETE)}")
    ausr = [x.strip() for x in (a.ausrichtung or "").split(",") if x.strip()]
    for x in ausr:
        if x not in AUSRICHTUNGEN:
            raise SystemExit(f"FEHLER: unbekannte Ausrichtung '{x}' — erlaubt: hoch, quer")
    themen = [x.strip() for x in (a.thema or "").split(",") if x.strip()]
    for x in themen:
        if x not in THEMEN:
            raise SystemExit(f"FEHLER: unbekanntes Thema '{x}' — erlaubt: hell, dunkel")

    bilder = a.bild or a.bild_labor or a.bild_gezogen
    einzeln = (not a.lauf) and len(geraete) <= 1 and len(ausr) <= 1 and len(themen) <= 1
    if bilder and not einzeln:
        raise SystemExit("FEHLER: --bild/--bild-labor/--bild-gezogen gilt nur für EIN Profil.\n"
                         "  Für einen Lauf: --bild-ordner und --bild-praefix (oder --ohne-bild).")

    if not einzeln:
        if a.breite or a.hoehe:
            raise SystemExit("FEHLER: --breite/--hoehe gilt nur für ein einzelnes Profil "
                             "(ohne --lauf und ohne Listen).")
        gs = geraete or list(GERAETE)
        ass = ausr or ["hoch", "quer"]
        th = themen or ["dunkel"]
        return [{"geraet": g, "ausrichtung": x, "thema": t,
                 "breite": masse(g, x)[0], "hoehe": masse(g, x)[1], "dpr": masse(g, x)[2]}
                for g in gs for x in ass for t in th]

    g = geraete[0] if geraete else None
    x = ausr[0] if ausr else None
    t = themen[0] if themen else "dunkel"
    if g or not (a.breite or a.hoehe):
        g = g or "pixel7"
        x = x or "hoch"
        b, h, d = masse(g, x)
        if a.breite:
            b = a.breite
        if a.hoehe:
            h = a.hoehe
    else:
        b = a.breite or 412
        h = a.hoehe or 915
        d = 2.625
        x = x or ("hoch" if h >= b else "quer")
        g = f"{b}×{h}"
    if a.dpr:
        d = a.dpr
    return [{"geraet": g, "ausrichtung": x, "thema": t, "breite": b, "hoehe": h, "dpr": d}]


def bildpfade(a, pr, einzeln):
    """Bildpfade je Profil. Einzelmessung: die angegebenen Pfade. Lauf: automatisch benannt."""
    if a.ohne_bild:
        return {}
    if einzeln:
        return {k: v for k, v in (("start", a.bild), ("labor", a.bild_labor), ("gezogen", a.bild_gezogen)) if v}
    basis = Path(a.bild_ordner) / f"{a.bild_praefix}-{pr['geraet']}-{pr['ausrichtung']}-{pr['thema']}"
    return {"start": Path(str(basis) + "-start.png"),
            "labor": Path(str(basis) + "-labor.png"),
            "gezogen": Path(str(basis) + "-gezogen.png")}


# ---------------------------------------------------------------- ein Profil messen

def messe_profil(ws, a, pr, probe: Path, nr=None, gesamt=None):
    """Ein Profil vollständig messen: laden, Thema, Bilder, Labor, Werte, Ziehprobe."""
    if nr:
        print(f"\n[{nr}/{gesamt}] {pr['geraet']} {pr['ausrichtung']} {pr['thema']}: "
              f"{pr['breite']}×{pr['hoehe']} CSS-Pixel, DPR {pr['dpr']}", flush=True)
    vorher = len(ws.fehler)
    setze_masse(ws, pr["breite"], pr["hoehe"], pr["dpr"], pr["ausrichtung"], a.ohne_orientierung)
    ws.rufen("Page.navigate", {"url": probe.as_uri()})
    warte_auf_spiel(ws)
    time.sleep(1.2)

    # Farbschema nach dem Start setzen und zusätzlich das spieleigene Thema erzwingen.
    ws.rufen("Emulation.setEmulatedMedia",
             {"media": "", "features": [{"name": "prefers-color-scheme", "value": pr["thema"]}]})
    daten_thema, tf = rufe(ws, THEMA_SETZEN % ("true" if pr["thema"] == "dunkel" else "false"))
    time.sleep(0.6)

    bilder = pr["bilder"]
    if bilder.get("start"):
        schuss(ws, bilder["start"])

    # Startansicht messen, BEVOR das Labor geladen wird (eigene Tabellenzeile).
    # Welche Ansicht der Start ist, hängt am Spielstand (src/ui/spiel.js: „heute" bzw. der
    # Einstieg ins Labor). Für eine vergleichbare Messung wird die Startansicht ausdrücklich
    # angesteuert: der erste Eintrag der Ansichtsliste — das ist „Heute" (Hub).
    startansicht = None
    if a.mit_start and not a.ohne_labor:
        startansicht, _ = rufe(ws, STARTANSICHT)
        time.sleep(0.8)
        if bilder.get("start"):
            schuss(ws, bilder["start"])
    startmess, startfehler = None, None
    if a.mit_start and not a.ohne_labor:
        startmess, startfehler = rufe(ws, MESSUNG)

    labor, lf = None, None
    if not a.ohne_labor:
        labor, lf = rufe(ws, LABOR_LADEN % f"DATEN.beispiele.{a.vorlage}", warten=True)
        time.sleep(0.8)
        ansicht_jetzt, _ = rufe(ws, LABOR_ZEIGEN)
        time.sleep(1.4)
        if bilder.get("labor"):
            schuss(ws, bilder["labor"])

    mess, mf = rufe(ws, MESSUNG)
    einpassen = None
    if not a.ohne_labor:
        einpassen, ef = rufe(ws, EINPASSEN, warten=True)
        if ef and einpassen is None:
            einpassen = {"fehler": ef}
    zug, zugfehler = None, None
    zoomprobe = None
    if not a.ohne_labor and a.zoomprobe:
        zoomprobe, zf = rufe(ws, ZOOM_PROBE, warten=True)
        if zf and zoomprobe is None:
            zoomprobe = {"fehler": zf}
    if a.ziehprobe and not a.ohne_labor:
        zug, zugfehler = ziehprobe(ws)
        if bilder.get("gezogen"):
            schuss(ws, bilder["gezogen"])

    ansichten = None
    if a.mit_ansichten and not a.ohne_labor:
        ansichten, af = rufe(ws, ANSICHTEN, warten=True)
        if af and ansichten is None:
            ansichten = {"fehler": af, "ansichten": []}
        if bilder.get("gezogen"):
            schuss(ws, bilder["gezogen"])
        # Je Ansicht ein Bild — jeder Befund braucht einen Beleg (--bild-ansichten).
        if a.bild_ansichten:
            for v in (ansichten or {}).get("ansichten", []):
                name = v.get("ziel") or "?"
                rufe(ws, ANSICHT_ZEIGEN % json.dumps(name))
                time.sleep(0.7)
                ziel = Path(a.bild_ordner) / f"{a.bild_praefix}-{pr['geraet']}-{pr['ausrichtung']}-{pr['thema']}-ansicht-{name}.png"
                schuss(ws, ziel)
            rufe(ws, ANSICHT_ZEIGEN % json.dumps("labor"))
            time.sleep(0.6)

    bedienung = None
    if a.bedienprobe:
        bedienung, bf = rufe(ws, BEDIENUNG, warten=True)
        if bf and bedienung is None:
            bedienung = {"fehler": bf}
        if bilder.get("gezogen"):
            schuss(ws, bilder["gezogen"])

    # Ganz am Ende: der Zoomwechsel lädt eine ANDERE Vorlage — danach ist dieses Profil fertig.
    zoomwechsel = None
    if a.zoomwechsel and not a.ohne_labor:
        zoomwechsel, zwf = rufe(ws, ZOOM_WECHSEL, warten=True)
        if zwf and zoomwechsel is None:
            zoomwechsel = {"fehler": zwf}

    return {"profil": f"{pr['geraet']}/{pr['ausrichtung']}/{pr['thema']}",
            "geraet": pr["geraet"], "ausrichtung": pr["ausrichtung"], "thema": pr["thema"],
            "ansicht": "start" if a.ohne_labor else "labor",
            "breite": pr["breite"], "hoehe": pr["hoehe"], "dpr": pr["dpr"],
            "mess": mess, "messfehler": mf, "labor": labor, "laborfehler": lf,
            "startmess": startmess, "startfehler": startfehler, "startansicht": startansicht,
            "einpassen": einpassen, "ansichten": ansichten, "zoomprobe": zoomprobe,
            "zoomwechsel": zoomwechsel,
            "datenThema": daten_thema, "themaFehler": tf,
            "zug": zug, "zugfehler": zugfehler, "bedienung": bedienung,
            "jsFehler": (mess or {}).get("jsFehler") or [],
            "konsoleFehler": (mess or {}).get("konsoleFehler") or [],
            "protokollFehler": ws.fehler[vorher:],
            "bilder": {k: str(v) for k, v in bilder.items()}}


def startzeile(p):
    """Aus einem Labor-Eintrag die Zeile für die STARTANSICHT bauen (gleiche Maße, ohne Labor)."""
    s = dict(p)
    s["mess"] = p.get("startmess")
    s["messfehler"] = p.get("startfehler")
    s["ansicht"] = "start"
    s["labor"] = None
    s["zug"] = None
    s["zugfehler"] = None
    s["bedienung"] = None
    s["ansichten"] = None
    s["einpassen"] = None
    s["zoomprobe"] = None
    s["zoomwechsel"] = None
    s["profil"] = p["profil"] + "/Start"
    s["jsFehler"] = (p.get("startmess") or {}).get("jsFehler") or []
    s["konsoleFehler"] = (s["mess"] or {}).get("konsoleFehler") or []
    return s


# ---------------------------------------------------------------- Zielwerte

def werkzeugleiste(m):
    """Die schwebende Werkzeugleiste aus der Messung (lb-leiste-oben oder nl-Ersatz)."""
    return m.get("werkzeugleiste")


# ---------------------------------------------------------------- „eingepasst“
# Hier stand einmal ein fester Netzmaßstab (740×470, aus zwei Messungen zurückgerechnet).
# Der ist wieder verworfen: die Ansichten zeigen verschiedene Netze (Startansicht ≠ Vorlage
# salon), und „eingepasst" hängt am Zustand der Fläche. Geprüft wird jetzt, was das Spiel
# selbst sagt — `UI.labor.einpassen(false)` aufrufen und den Zoom vergleichen (siehe EINPASSEN).


def kurz(liste, n=3, feld="klasse"):
    """Kurze Aufzählung für eine Meldung: Klassen der ersten n Einträge."""
    namen = []
    for e in liste[:n]:
        namen.append(e.get(feld) or e.get("pfad") or "?")
    rest = "" if len(liste) <= n else f" (+{len(liste) - n} weitere)"
    return ", ".join(namen) + rest


def pruefe(p, a):
    """Zielwerte prüfen. Rückgabe: Liste (Kriterium, ok, Meldung_wenn_rot, Zahl).

    „Nicht geprüft“ ist nicht „rot“: was absichtlich aus ist (Kabelzug ohne --ziehprobe)
    oder in dieser Ansicht nicht existiert (Zeichenfläche in der Startansicht), wird gar
    nicht erst als Kriterium aufgeführt — im Ausdruck steht es als „nicht geprüft“.
    """
    m = p["mess"] or {}
    aus = p["ausrichtung"]
    labor_ansicht = p.get("ansicht", "labor") == "labor"
    z = []

    def satz(name, ok, text, wert=None):
        z.append((name, bool(ok), text, wert))

    if m.get("leinwand"):
        anteil = m.get("flaecheAnteil")
        soll = 0.85 if aus == "hoch" else 0.80
        satz("Zeichenfläche", (anteil or 0) >= soll,
             f"Zeichenfläche {100 * (anteil or 0):.1f} % der Bildschirmbreite < {100 * soll:.0f} %",
             anteil)
        tot = m.get("toteFlaecheRechts")
        satz("Tote Fläche rechts", (tot or 0) <= 8, f"tote Fläche rechts {tot} px > 8 px", tot)
        wl = werkzeugleiste(m)
        if wl:
            zeilen, hoehe = wl.get("zeilen", 0), wl["r"]["h"]
            if aus == "hoch":
                satz("Werkzeugleiste", zeilen <= 1 and hoehe <= 56,
                     f"Werkzeugleiste {zeilen} Zeile(n) und {hoehe} px hoch "
                     f"(Hochformat: höchstens 1 Zeile / 56 px)", (zeilen, hoehe))
            else:
                satz("Werkzeugleiste", zeilen <= 2,
                     f"Werkzeugleiste {zeilen} Zeilen (Querformat: höchstens 2)", zeilen)
        if m.get("zoom") is not None:
            zoom = m["zoom"]
            if p["geraet"] == "pixel7" and aus == "hoch" and (p["breite"], p["hoehe"]) == (412, 915):
                satz("Zoom (Referenzgerät)", zoom >= 0.5,
                     f"Zoom {zoom} < 0.5 auf dem Referenzgerät 412×915 hoch", zoom)
        # „Eingepasst" wird NACHGEMESSEN, nicht gerechnet: das Spiel selbst einpassen lassen
        # und vergleichen. (Ein fester Netzmaßstab war falsch — die Ansichten zeigen
        # verschiedene Netze, und der Zoom bleibt nach dem Laden stehen, wenn sich die
        # Fläche danach noch ändert.)
        ep = p.get("einpassen") or {}
        if labor_ansicht and not a.ohne_labor and ep.get("vorher") and ep.get("nachher"):
            gewinn = ep["gewinn"] or (ep["nachher"] / ep["vorher"])
            zu_klein = gewinn > 1.02
            zu_gross = gewinn < 0.98
            satz("Zoom eingepasst", not (zu_klein or zu_gross),
                 f"nach dem Laden Zoom {ep['vorher']}, nach „Alles einpassen“ {ep['nachher']} "
                 f"({100 * (gewinn - 1):+.1f} %) bei Zeichenfläche "
                 f"{ep['leinwand']['w']}×{ep['leinwand']['h']} px — "
                 + ("die Zeichnung war zu klein" if zu_klein else
                    "die Zeichnung war zu groß (das Netz wird beschnitten)" if zu_gross else ""),
                 ep["nachher"])
        elif labor_ansicht and not a.ohne_labor and ep.get("fehler"):
            satz("Zoom eingepasst", False, f"Einpassen nicht messbar: {ep['fehler']}", None)
    elif labor_ansicht and not a.ohne_labor:
        satz("Zeichenfläche", False, "keine Zeichenfläche .lb-leinwand gefunden", None)

    ab = m.get("abgeschnitten") or []
    satz("Abgeschnittener Text", not ab,
         f"{len(ab)} abgeschnittene Elemente: {kurz(ab)}", len(ab))
    au = m.get("ausserhalb") or []
    satz("Ragt aus dem Bildschirm", not au,
         f"{len(au)} Elemente ragen aus dem Bildschirm: {kurz(au)}", len(au))

    bed = m.get("bedienbar") or {}
    klein = m.get("kleinsteTrefferflaeche")
    satz("Trefferflächen", (bed.get("unter44") or 0) == 0,
         f"{bed.get('unter44')} von {bed.get('gesamt')} sichtbaren Knöpfen unter 44×44 px"
         + (f" (kleinster {klein['w']}×{klein['h']} {klein['klasse'] or klein['pfad']})" if klein else "")
         + ("  —  " + "; ".join(f"{k['w']}×{k['h']} „{k['text'][:20]}“ ({k['klasse'] or k['pfad']})"
                                for k in (bed.get("liste") or [])[:4]) if bed.get("liste") else ""),
         bed.get("unter44"))

    ue = m.get("ueberlaufBildschirm") or {}
    satz("Überlauf", abs(ue.get("x", 0)) <= 2 and abs(ue.get("y", 0)) <= 2,
         f"die Oberfläche ist {ue.get('x')} px breiter und {ue.get('y')} px höher als der "
         f"Bildschirm {m.get('bildschirm', {}).get('w')}×{m.get('bildschirm', {}).get('h')} "
         f"(Layout {m.get('groesse', {}).get('w')}×{m.get('groesse', {}).get('h')}) — erlaubt 2 px",
         (ue.get("x"), ue.get("y")))

    satz("JS-Fehler", not p["jsFehler"], f"{len(p['jsFehler'])} JS-Fehler: {p['jsFehler'][:2]}",
         len(p["jsFehler"]))

    if not a.ohne_labor and labor_ansicht:
        ok = bool(p["labor"]) and (m.get("geraeteGezeichnet") or 0) > 0
        text = "das Labor wurde nicht geladen" if not p["labor"] else \
               ("kein Gerät gezeichnet — die Zeichenfläche ist leer"
                if (m.get("geraeteGezeichnet") or 0) <= 0 else "")
        satz("Labor und Geräte", ok, text, m.get("geraeteGezeichnet"))

    if a.ziehprobe and not a.ohne_labor and labor_ansicht:
        if p["zugfehler"]:
            satz("Kabelzug", False, f"Kabelzug mit dem Finger nicht messbar: {p['zugfehler']}", None)
        else:
            zug = p["zug"] or {}
            vor, nach = zug.get("kabelVorher"), zug.get("kabelNachher")
            satz("Kabelzug", nach is not None and vor is not None and nach > vor,
                 f"Kabelzug mit dem Finger hat kein Kabel erzeugt ({vor} → {nach})", nach)

    # Alle sieben Navigationsansichten (--mit-ansichten): ein Kriterium je Profil,
    # die Einzelheiten stehen in der Sektion „Ansichten“.
    if labor_ansicht and p.get("ansichten"):
        view = p["ansichten"].get("ansichten") or []

        def wirklich(v):
            """Nur echte Befunde: keine absichtlichen Zeilenbegrenzungen, keine nur
            scrollbaren Elemente (Wischen ist Bedienung, nicht Abschneiden)."""
            ab = [t for t in (v.get("abgeschnitten") or []) if not t.get("absicht")]
            au = [t for t in (v.get("ausserhalb") or []) if t.get("erreichbar") != 'scrollbar']
            return len(v.get("unter44") or []) + len(ab) + len(au)

        kaputt = [v for v in view if wirklich(v)]
        kleinZahl = sum(len(v.get("unter44") or []) for v in view)
        abschnZahl = sum(len([t for t in (v.get("abgeschnitten") or []) if not t.get("absicht")])
                         for v in view)
        drausZahl = sum(len([t for t in (v.get("ausserhalb") or []) if t.get("erreichbar") != 'scrollbar'])
                        for v in view)
        satz("Alle Ansichten", not kaputt,
             f"{len(kaputt)} von {len(view)} Ansichten mit Befund: {kleinZahl} Knöpfe unter "
             f"44×44 px, {abschnZahl} abgeschnittene Texte, {drausZahl} Elemente außerhalb "
             f"({', '.join(v.get('titel') or v.get('ziel') or '?' for v in kaputt[:5])})",
             len(kaputt))

    # Von mobil.js ergänzte Elemente: außerhalb der Telefon-Stufe (Tablet) darf nichts
    # Sichtbares herumliegen. Auf dem Telefon sind FABs und Blätter erwartet.
    me = m.get("mobilElemente") or []
    if m.get("leinwand"):
        sichtbare = [x for x in me if x.get("sichtbar")]
        if p["geraet"] == "tablet":
            # Ein Rest ist erst dann ein Mangel, wenn ihn an seiner Fläche auch ein
            # Tastendruck trifft (elementFromPoint, fünf Punkte). Steht er nur im DOM und
            # etwas anderes liegt darüber, ist er weder zu sehen noch anzuklicken.
            echte = [x for x in sichtbare if (x.get("treffer") or {}).get("selbst", 0) > 0]
            satz("Zusatzelemente (Tablet)", not echte,
                 f"{len(echte)} von mobil.js ergänzte Elemente sind auf dem Tablet wirklich "
                 f"anklickbar: " + ", ".join(f"{x['s']} {x['r']['w']}×{x['r']['h']} px bei "
                                              f"x{x['r']['x']} y{x['r']['y']} (oben liegt: {x.get('obenKlasse')})"
                                              for x in echte)
                 + (f" — {len(sichtbare) - len(echte)} weitere stehen nur im DOM und sind "
                    f"vollständig verdeckt (0 von 5 Tastpunkten treffen sie)"
                    if len(sichtbare) > len(echte) else ""), len(echte))

    # Zoomwechsel: erst von Hand zoomen, dann ein zweites Ticket laden. Danach muss wieder
    # sauber eingepasst sein — der eigene Zoom darf aber NICHT überschrieben werden, solange
    # der Nutzer die Leinwand nicht anfasst (Heilung von „mobil-flaeche", 06.10.2026).
    zw = p.get("zoomwechsel") or {}
    if labor_ansicht and not a.ohne_labor and zw and not zw.get("fehler"):
        if zw.get("geklickt"):
            satz("Eigener Zoom bleibt", (zw.get("zoomNutzer") or 0) > (zw.get("zoomVorher") or 0),
                 f"der selbst gewählte Zoom wurde nicht übernommen "
                 f"({zw.get('zoomVorher')} → {zw.get('zoomNutzer')} nach {zw.get('geklickt')}× "
                 f"„Vergrößern“)", zw.get("zoomNutzer"))
        if zw.get("zoomNachTicket") and zw.get("zoomNachEinpassen"):
            q = zw["zoomNachTicket"] / zw["zoomNachEinpassen"]
            satz("Zoom nach Ticketwechsel", 0.98 <= q <= 1.02,
                 f"nach dem Laden der Vorlage praxis Zoom {zw['zoomNachTicket']} statt eingepasst "
                 f"{zw['zoomNachEinpassen']} ({100 * (q - 1):+.1f} %)", zw["zoomNachTicket"])
    elif labor_ansicht and not a.ohne_labor and zw.get("fehler"):
        satz("Zoomwechsel", False, f"nicht messbar: {zw['fehler']}", None)
    return z


# ---------------------------------------------------------------- Ausgabe

def tabelle(zeilen, spalten):
    breiten = [len(s) for s, _ in spalten]
    for z in zeilen:
        for i, (_, f) in enumerate(spalten):
            breiten[i] = max(breiten[i], len(str(f(z))))
    print("  " + "  ".join(s.ljust(breiten[i]) for i, (s, _) in enumerate(spalten)))
    print("  " + "  ".join("-" * b for b in breiten))
    for z in zeilen:
        print("  " + "  ".join(str(f(z)).ljust(breiten[i]) for i, (_, f) in enumerate(spalten)))


def pz(x, stellen=1, einheit=""):
    if x is None:
        return "—"
    return f"{x:.{stellen}f}{einheit}"


def drucke_messung(p):
    """Ausführliche Einzelmessung (wie vorher) plus die neuen Größen."""
    m = p["mess"] or {}
    print(f"  Profil           {p['profil']}, {p['breite']}×{p['hoehe']} CSS-Pixel, DPR {p['dpr']}")
    if not m:
        print(f"  ROT: keine Messwerte. {p.get('messfehler') or ''}")
        return
    zeile("Fenstermaß", f"{m['groesse']['w']}×{m['groesse']['h']} (DPR {m['groesse']['dpr']})")
    zeile("Bildschirm", f"{m.get('bildschirm', {}).get('w')}×{m.get('bildschirm', {}).get('h')} CSS-Pixel "
                        f"(was der Nutzer sieht)")
    f = m.get("fenster") or {}
    zeile("Fenster/Viewport", f"outer {f.get('outer', {}).get('w')}×{f.get('outer', {}).get('h')}, "
                              f"screen {f.get('screen', {}).get('w')}×{f.get('screen', {}).get('h')}, "
                              f"visual {f.get('visual')}, meta viewport {f.get('meta')!r}")
    zeile("Ausrichtung", f"gewünscht {p['ausrichtung']}, matchMedia: portrait="
                         f"{m['orientierung']['portrait']} landscape={m['orientierung']['landscape']}")
    zeile("pointer: coarse", f"{m['grob']}   maxTouchPoints {m['beruehrung']}")
    zeile("Farbschema", f"{'dunkel' if m['dunkel'] else 'hell'}   data-theme={m['thema']}   "
                        f"body {m['farben']['hintergrund']}")
    zeile("Inhalt größer als Fenster", f"{m['ueberlauf']['x']} px breit, {m['ueberlauf']['y']} px hoch "
                                       f"(Layout); gegen den Bildschirm: "
                                       f"{m['ueberlaufBildschirm']['x']} px breit, "
                                       f"{m['ueberlaufBildschirm']['y']} px hoch")
    if p["labor"]:
        zeile("Labor geladen", f"{p['labor'].get('geraete')} Geräte")
    for name in ("kopf", "nav", "labor", "geraete", "mitte", "leinwand", "svg", "auftrag", "flaeche", "lbDock"):
        k = m.get(name)
        zeile(name, "—" if not k else f"x{k['x']} y{k['y']}  {k['w']}×{k['h']}")
    zeile("Zeichenfläche Anteil", f"{pz(100 * m['flaecheAnteil'] if m['flaecheAnteil'] is not None else None)} % "
                                  f"der BILDSCHIRMbreite (Zielwert ≥ 85 % hoch / 80 % quer); "
                                  f"vom Layoutfenster "
                                  f"{pz(100 * m['flaecheAnteilFenster'] if m.get('flaecheAnteilFenster') is not None else None)} %")
    zeile("Tote Fläche", f"rechts {m['toteFlaecheRechts']} px (Ziel ≤ 8), links {m['toteFlaecheLinks']} px, "
                         f"unten {m['toteFlaecheUnten']} px")
    for l in m["leisten"]:
        zeile("Leiste " + (l["klasse"] or l["s"]),
              f"x{l['r']['x']} y{l['r']['y']}  {l['r']['w']}×{l['r']['h']}  {l['zeilen']} Zeile(n) an den "
              f"Knöpfen ({l.get('zeilenGruppen')} an den Gruppen), {l['teile']} Teile, {l['breite']} px breit")
    wl = werkzeugleiste(m)
    if wl:
        zeile("Werkzeugleiste", f"{wl['zeilen']} Zeile(n), {wl['r']['h']} px hoch, {wl['r']['w']} px breit")
    zeile("Zeichenfläche verdeckt", f"{pz(100 * m['verdecktAnteil'] if m['verdecktAnteil'] is not None else None)} %")
    zeile("Kollision Leiste/Gerät", f"{m['kollisionZahl']} von {m['geraeteGezeichnet']} Geräten betroffen"
          + ("" if not m["kollision"] else f"  {m['kollision'][:2]}"))
    zeile("Zoom im Labor", f"{m['zoom']}")
    ep = p.get("einpassen") or {}
    if ep.get("vorher") or ep.get("nachher"):
        zeile("Zoom nach Einpassen", f"vorher {ep.get('vorher')} → nach „Alles einpassen“ "
                                     f"{ep.get('nachher')} (+{100 * ((ep.get('gewinn') or 1) - 1):.1f} %)"
              + (f"   FEHLER: {ep['fehler']}" if ep.get("fehler") else ""))
    zeile("Zoom-Knopf", "—" if not m["zoomKnopf"] else f"{m['zoomKnopf']['w']}×{m['zoomKnopf']['h']} px")
    zeile("Geräte gezeichnet", f"{m['geraeteGezeichnet']}")
    kk = m["kleinsteTrefferflaeche"]
    zeile("Kleinste Trefferfläche", "—" if not kk else
          f"{kk['w']}×{kk['h']} px  {kk['klasse'] or kk['pfad']}  „{kk['text']}“")
    zeile("Knöpfe", f"{m['bedienbar']['gesamt']} sichtbar, davon {m['bedienbar']['unter44']} unter 44×44 px")
    for k in m["bedienbar"]["liste"][:8]:
        print(f"      zu klein     {k['w']}×{k['h']} px  {k['klasse'] or k['pfad']}  „{k['text']}“")
    zeile("Abgeschnitten", f"{len(m['abgeschnitten'])} Element(e)")
    for e in m["abgeschnitten"][:10]:
        print(f"      {e['bereich']:<11} {e['klasse'] or e['pfad']:<28} "
              f"Platz {e['platz']} px, braucht {e['braucht']} px  „{e['text']}“")
    zeile("Ragt aus dem Bildschirm", f"{len(m['ausserhalb'])} Element(e)")
    for e in m["ausserhalb"][:10]:
        print(f"      {e['bereich']:<11} {e['klasse'] or e['pfad']:<28} "
              f"links {e['links']} rechts {e['rechts']} oben {e['oben']} unten {e['unten']}  „{e['text']}“")
    for g, e in m["erreichbar"].items():
        zeile("erreichbar " + g, f"{e['da']} da, {e['unsichtbar']} unsichtbar, {e['draussen']} ganz draußen, "
                                 f"{e['teilweise']} teilweise draußen, {e['zuKlein']} unter 44 px")
    zeile("Sichere Ränder", f"--nl-safe-*: {m['safeArea']['nl'] or '(nicht gesetzt)'}   "
                            f"env(): {m['safeArea']['env']}")
    for x in (m.get("mobilElemente") or []):
        zeile("Android-Element " + x["s"],
              f"{x['da']} im DOM, {x['sichtbar']} sichtbar"
              + (f", {x['r']['w']}×{x['r']['h']} px x{x['r']['x']} y{x['r']['y']}" if x.get("r") else "")
              + f", display={x['display']}, visibility={x['visibility']}, opacity={x['opacity']}"
              + (f", Tastpunkte die es treffen: {x['treffer']['selbst']}/{x['treffer']['von']}"
                 f" (an der Mitte oben: {x.get('obenKlasse')})" if x.get("treffer") else "")
              + (", überdeckt die Zeichenfläche" if x.get("ueberLeinwand") else ""))
    l = m.get("leiste") or {}
    zeile("Leisten-Modus", f"vorher {l.get('vor')} → Wechsel auf 'leiste' → {l.get('nach')}"
          + ("   (abgefangen)" if l.get("nach") == "voll" else "   NICHT abgefangen"))
    zeile("JS-Fehler", f"{len(p['jsFehler'])} {p['jsFehler']}")
    zeile("Konsolenfehler", f"{len(p['konsoleFehler'])} {p['konsoleFehler']}")
    zeile("Protokollfehler", f"{len(p['protokollFehler'])} {p['protokollFehler'][:2]}")
    if m.get("mobil"):
        mo = m["mobil"]
        zeile("Android-Schicht", f"inApp={mo.get('inApp')} huelle={mo.get('huelle')} grob={mo.get('grob')}")
    if p["zugfehler"]:
        zeile("Kabelzug mit dem Finger", f"FEHLER: {p['zugfehler']}")
    elif p["zug"]:
        zu = p["zug"]["kabelNachher"] - p["zug"]["kabelVorher"]
        zeile("Kabelzug mit dem Finger", f"{p['zug']['von']} → {p['zug']['nach']}, {p['zug']['gezogen']}")
        zeile("Kabel vorher/nachher", f"{p['zug']['kabelVorher']} → {p['zug']['kabelNachher']} ({zu:+d})")
        if p["zug"]["kabel"]:
            zeile("Kabel im Netz", ", ".join(p["zug"]["kabel"]))
    if p.get("bilder"):
        for k, v in p["bilder"].items():
            print(f"  Bild {k:<12} {v}")
    if p.get("zoomprobe"):
        drucke_zoomprobe(p["zoomprobe"])


def drucke_bedienung(b):
    if not b:
        return
    print("  Bedienprobe (angeklickt, nicht geraten):")
    if b.get("fehler"):
        print(f"    FEHLER: {b['fehler']}")
    for e in b.get("ansichten", []):
        masse_t = f"{e['masse']['w']}×{e['masse']['h']} px" if e.get("masse") else "—"
        print(f"    Ansicht    {e['ziel']:<10} {e['stand']:<22} Knopf {e.get('knopf') or '—':<20} {masse_t}"
              + (f"  im Bild: {e.get('drin')}  zu klein: {e.get('zuKlein')}" if e.get("masse") else ""))
    if b.get("oeffnerGeraete"):
        print(f"    Öffner für Gerätefächer (versucht): {[o['klasse'] or o['text'] for o in b['oeffnerGeraete']]}")
    if b.get("oeffnerGeraeteErfolg"):
        o = b["oeffnerGeraeteErfolg"]
        print(f"    Geräteblatt geöffnet mit {o['klasse']} ({o['masse']['w']}×{o['masse']['h']} px)")
    print(f"    Gerätekategorien sichtbar: {b.get('kategorienSichtbar')} "
          f"(Blatt offen: {b.get('geraeteBlattOffen')})")
    for e in b.get("kategorien", []):
        print(f"    Kategorie  {e['name'][:16]:<16} {e['stand']:<22} "
              f"{e['masse']['w']}×{e['masse']['h']} px, {e.get('faecher')} Fächer, {e.get('teile')} Teile")
        if e.get("fach"):
            print(f"      Fach     {e['fach']['masse']['w']}×{e['fach']['masse']['h']} px, "
                  f"ganz im Bild: {e['fach']['drin']}, Teile außerhalb: {e.get('teileAusserhalb')}, "
                  f"Teile unter 44 px: {e.get('teileZuKlein')}")
    if b.get("mehrKnopf"):
        print(f"    ⋯-Knopf    {b['mehrKnopf']['klasse']} ({b['mehrKnopf']['masse']['w']}×"
              f"{b['mehrKnopf']['masse']['h']} px)")
    if b.get("menue"):
        print(f"    Kopf-Menü  {b['menue']['masse']['w']}×{b['menue']['masse']['h']} px, "
              f"ganz im Bild: {b['menue']['drin']}")
    for p in b.get("menuePunkte", []):
        print(f"      Punkt    {p['text'][:26]:<26} {p['masse']['w']}×{p['masse']['h']} px, "
              f"im Bild: {p['drin']}, zu klein: {p['zuKlein']}")
    if b.get("oeffnerDock"):
        print(f"    Öffner für das Dock (versucht): {[o['klasse'] or o['text'] for o in b['oeffnerDock']]}")
    if b.get("oeffnerDockErfolg"):
        o = b["oeffnerDockErfolg"]
        print(f"    Dockblatt geöffnet mit {o['klasse']} ({o['masse']['w']}×{o['masse']['h']} px)")
    print(f"    Dock-Reiter sichtbar: vorher {b.get('reiterVorher')}, nach Öffner-Versuch "
          f"{b.get('reiterNachOeffnen')}; Dock sichtbar: {b.get('dockOffen')} {b.get('dockMasse') or ''}")
    for e in b.get("reiter", []):
        print(f"    Reiter     {e['name'][:16]:<16} {e['stand']:<22} "
              f"{e['masse']['w']}×{e['masse']['h']} px, Inhalt {e.get('inhalt')} {e.get('masseInhalt') or ''}")
        for k in (e.get("kinder") or []):
            print(f"      Inhalt   {k['klasse'][:28]:<28} versteckt={k['versteckt']} "
                  f"sichtbar={k['sichtbar']} {k['masse']['w']}×{k['masse']['h']} px")


def drehe(ws, a, probe: Path, geraet="pixel7"):
    """Drehprobe: Fenster drehen OHNE Neuladen und nachsehen, ob der Stand überlebt.

    Geprüft wird die SEITE: bleibt das Dokument lebendig (Marke im window), bleiben Kabel und
    Geräte stehen, bleibt die Ansicht? Ob die Android-Activity das Drehen ohne Neuerzeugung
    übersteht, ist Sache der Hülle (android/huelle) und hier NICHT messbar.
    """
    pr = {"geraet": geraet, "ausrichtung": "hoch", "thema": a.thema.split(",")[0] if a.thema else "dunkel",
          "breite": masse(geraet, "hoch")[0], "hoehe": masse(geraet, "hoch")[1], "dpr": masse(geraet, "hoch")[2]}
    print(f"\nDrehprobe {geraet}: hoch → quer → hoch, ohne Neuladen", flush=True)
    setze_masse(ws, pr["breite"], pr["hoehe"], pr["dpr"], "hoch", a.ohne_orientierung)
    ws.rufen("Page.navigate", {"url": probe.as_uri()})
    warte_auf_spiel(ws)
    time.sleep(1.2)
    rufe(ws, THEMA_SETZEN % ("true" if pr["thema"] == "dunkel" else "false"))
    time.sleep(0.4)
    rufe(ws, LABOR_LADEN % f"DATEN.beispiele.{a.vorlage}", warten=True)
    time.sleep(1.4)
    zug, zugfehler = ziehprobe(ws) if a.ziehprobe else (None, None)
    stand, _ = rufe(ws, DREH_STAND)
    bild_hoch = Path(a.bild_ordner) / f"{a.bild_praefix}-dreh-hoch-start.png"
    if not a.ohne_bild:
        schuss(ws, bild_hoch)

    ergebnis = {"geraet": geraet, "stand": stand, "zugfehler": zugfehler,
                "zug": zug, "quer": None, "zurueck": None}
    for name, ausr in (("quer", "quer"), ("zurueck", "hoch")):
        setze_masse(ws, masse(geraet, ausr)[0], masse(geraet, ausr)[1], pr["dpr"], ausr, a.ohne_orientierung)
        time.sleep(2.0)
        nach, f = rufe(ws, DREH_NACH)
        mess, mf = rufe(ws, MESSUNG)
        ergebnis[name] = {"nach": nach, "mess": mess, "fehler": f or mf}
        if not a.ohne_bild:
            schuss(ws, Path(a.bild_ordner) / f"{a.bild_praefix}-dreh-{ausr}-nach.png")
    return ergebnis


def drucke_ansichten(bl):
    """Sektion „Ansichten“: je Navigationsansicht Knöpfe unter 44 px, Text, Rand, JS."""
    if not bl:
        return
    if bl.get("fehler"):
        print(f"    FEHLER: {bl['fehler']}")
    letzte = None
    for v in bl.get("ansichten", []):
        fz = v.get("fehlerZahl")
        neu = "" if letzte is None or fz is None or fz <= letzte else f" (+{fz - letzte} JS-Fehler)"
        if fz is not None:
            letzte = fz
        masse = v.get("masse")
        kl_ = v.get("kleinste")
        print(f"    {v.get('titel', v.get('ziel')):<10} {v.get('knoepfe')} Knöpfe, "
              f"{len(v.get('unter44') or [])} unter 44 px, "
              f"{len(v.get('abgeschnitten') or [])} abgeschnitten, "
              f"{len(v.get('ausserhalb') or [])} außerhalb{neu}   "
              + (f"Ansicht {masse['w']}×{masse['h']} px" if masse else "Ansicht nicht sichtbar")
              + (f", kleinste Trefferfläche {kl_['w']}×{kl_['h']} px {kl_['klasse'] or '?'} "
                 f"„{kl_['text']}“" if kl_ else ""))
        for k in (v.get("unter44") or [])[:6]:
            print(f"        zu klein   {k['w']}×{k['h']} px  {k['klasse'] or '?'}"
                  f"{'  (Rahmen)' if not k.get('imBereich') else ''}  „{k['text']}“")
        for t in (v.get("abgeschnitten") or [])[:4]:
            print(f"        Text       {t['klasse'] or '?'} ({t.get('art', '?')}"
                  + (", absichtlich begrenzt" if t.get("absicht") else "") + f")  "
                  f"Platz {t['platz']} px, braucht {t['braucht']} px  „{t['text']}“")
        for t in (v.get("ausserhalb") or [])[:4]:
            print(f"        außerhalb  {t['klasse'] or '?'}  links {t['links']} rechts {t['rechts']} "
                  f"oben {t['oben']} unten {t['unten']}  erreichbar: {t.get('erreichbar')}  „{t['text']}“")


def drucke_zoomprobe(z):
    """Grenze zeigen: was passiert, wenn der Nutzer auf 100 % zoomt (IP-Beschriftungen)."""
    if not z:
        return
    v, n = z.get("vorher") or {}, z.get("nachher") or {}
    print(f"    Zoomprobe (Nutzerweg: Zoom-Menü → „Zoom 100 %\"): geklickt={z.get('geklickt')}"
          + (f"  FEHLER: {z['fehler']}" if z.get("fehler") else ""))
    print(f"      vorher  Zoom {v.get('zoom')}: {len(v.get('ips') or [])} IP-Beschriftungen sichtbar, "
          f"{v.get('unter44')} Knöpfe unter 44 px")
    if n:
        print(f"      nachher Zoom {n.get('zoom')}: {len(n.get('ips') or [])} IP-Beschriftungen sichtbar, "
              f"{n.get('unter44')} Knöpfe unter 44 px")
        for i in (n.get("ips") or [])[:5]:
            print(f"        IP-Beschriftung {i['klasse'] or '?'}  {i['w']}×{i['h']} px  „{i['text']}“")
        for k in (n.get("unter44") or [])[:5]:
            print(f"        zu klein        {k['w']}×{k['h']} px  {k['klasse'] or '?'}  „{k['text']}“")
    print(f"      danach wieder eingepasst: Zoom {z.get('zurueck')}")


def drucke_zoomwechsel(z):
    """Eigener Zoom und zweites Ticket: überschreibt die Heilung den Nutzerwillen?"""
    if not z:
        return
    print(f"      eigener Zoom: vorher {z.get('zoomVorher')} → nach {z.get('geklickt')}× "
          f"„Vergrößern“ {z.get('zoomNutzer')} → nach zweitem Ticket (Vorlage praxis) "
          f"{z.get('zoomNachTicket')} → nach „Alles einpassen“ {z.get('zoomNachEinpassen')}")
    print(f"      Geräte im zweiten Netz: {z.get('geraeteNachher')}, JS-Fehler "
          f"{z.get('jsFehlerVorher')} → {z.get('jsFehlerNachher')}"
          + (f"   FEHLER: {z['fehler']}" if z.get("fehler") else ""))


def drucke_dreh(d):
    if not d:
        return []
    print("\nDrehprobe (Fenster drehen ohne Neuladen — geprüft wird die Seite, nicht die Activity):")
    st = d["stand"] or {}
    print(f"  Ausgangslage: Marke {st.get('marke')}, Kabel {st.get('kabel')}, "
          f"Geräte {st.get('geraete')}, Ansicht {st.get('ansicht')}")
    rot = []
    for name, text in (("quer", "hoch → quer"), ("zurueck", "quer → hoch")):
        e = d.get(name) or {}
        n = e.get("nach") or {}
        m = e.get("mess") or {}
        print(f"  {text:<12} Marke überlebt: {'JA' if n.get('markeUeberlebt') else 'NEIN'}   "
              f"Kabel {n.get('kabelVorher')} → {n.get('kabelNachher')}   "
              f"Geräte {n.get('geraeteVorher')} → {n.get('geraeteNachher')}   "
              f"Ansicht {n.get('ansichtVorher')} → {n.get('ansichtNachher')}   "
              f"Fenster {n.get('groesse', {}).get('w')}×{n.get('groesse', {}).get('h')}   "
              f"Zeichenfläche {m.get('leinwand', {}).get('w') if m.get('leinwand') else '—'}×"
              f"{m.get('leinwand', {}).get('h') if m.get('leinwand') else '—'}   "
              f"JS-Fehler {len(n.get('jsFehler') or [])}")
        if not n.get("markeUeberlebt"):
            rot.append(f"beim Drehen {text} wurde die Seite neu geladen (Marke weg) — Stand verloren")
        if n.get("kabelVorher") is not None and n.get("kabelNachher") is not None \
                and n["kabelNachher"] < n["kabelVorher"]:
            rot.append(f"beim Drehen {text} sind Kabel verschwunden "
                       f"({n['kabelVorher']} → {n['kabelNachher']})")
        if n.get("geraeteVorher") is not None and n.get("geraeteNachher") is not None \
                and n["geraeteNachher"] < n["geraeteVorher"]:
            rot.append(f"beim Drehen {text} sind Geräte verschwunden "
                       f"({n['geraeteVorher']} → {n['geraeteNachher']})")
        if n.get("ansichtVorher") and n.get("ansichtNachher") != n.get("ansichtVorher"):
            rot.append(f"beim Drehen {text} wechselte die Ansicht "
                       f"({n.get('ansichtVorher')} → {n.get('ansichtNachher')})")
    return rot


# ---------------------------------------------------------------- statische Prüfung

def einfuegen(html: str, marke: str, text: str) -> str:
    """Wie android/bauen.py: Text unmittelbar vor `marke` einsetzen (erste </head>, letzte </body>)."""
    if marke == "</head>":
        i = html.find(marke)
        koerper = html.find("<body")
        if i == -1 or koerper == -1 or i > koerper:
            raise SystemExit("FEHLER: kein echtes </head> vor <body> gefunden.")
    else:
        i = html.rfind(marke)
        if i == -1 or len(html) - i > 400:
            raise SystemExit("FEHLER: kein </body> am Dateiende gefunden.")
    return html[:i] + text + html[i:]


def statisch(datei: Path) -> int:
    """Ohne Browser: steckt mobil.css/mobil.js wirklich in der gebauten Seite?"""
    import hashlib
    import re

    css_datei, js_datei = MOBIL / "mobil.css", MOBIL / "mobil.js"
    spiel = BAU / "spiel.html"
    print("Statische Prüfung: Android-Anpassung in der gebauten Seite")
    for f in (datei, css_datei, js_datei, spiel):
        if not f.is_file():
            print(f"  ROT: {f} fehlt.")
            return 1
    roh = datei.read_bytes()
    html = datei.read_text(encoding="utf-8")
    css = css_datei.read_text(encoding="utf-8").replace("\r\n", "\n")
    js = js_datei.read_text(encoding="utf-8").replace("\r\n", "\n").replace("</script", "<\\/script")
    print(f"  {datei.relative_to(PROJEKT)}  {len(roh):,} Bytes  "
          f"SHA256 {hashlib.sha256(roh).hexdigest()}")
    rot = []

    css_block = "<style>\n" + css + "\n</style>\n"
    js_block = "<script>\n" + js + "\n</script>\n"
    n_css, n_js = html.count(css_block), html.count(js_block)
    print(f"  mobil.css  {len(css_datei.read_bytes()):,} B  eingehängt: {n_css}× im <style>-Block")
    print(f"  mobil.js   {len(js_datei.read_bytes()):,} B  eingehängt: {n_js}× im <script>-Block")
    if n_css != 1:
        rot.append(f"mobil.css steckt {n_css}× in der Seite (erwartet 1) — Bau veraltet?")
    if n_js != 1:
        rot.append(f"mobil.js steckt {n_js}× in der Seite (erwartet 1) — Bau veraltet?")

    i_css, i_js = html.find(css_block), html.find(js_block)
    if i_css >= 0 and i_js >= 0:
        print(f"  Reihenfolge: CSS bei Zeichen {i_css:,}, JS bei Zeichen {i_js:,} "
              f"(CSS zuerst: {'ja' if i_css < i_js else 'NEIN'})")
        if i_css > i_js:
            rot.append("mobil.css steht hinter mobil.js — die Anpassung kann überschrieben werden")
    letztes = html.rfind("<script")
    print(f"  Letztes <script> der Seite: bei Zeichen {letztes:,} — "
          f"{'das ist der Android-Block' if letztes == i_js else 'NICHT der Android-Block'}")
    if letztes != i_js:
        rot.append("mobil.js ist nicht das letzte Skript — das Spiel könnte danach neu zeichnen")

    for verboten, name in ((r"<link[^>]+stylesheet", "externes CSS"),
                           (r"<script[^>]+src=", "externes Skript"),
                           (r"""url\(\s*["']?(?!data:)[^)"']+\.(woff2?|ttf|otf)""", "externe Schrift")):
        if re.search(verboten, html, re.I):
            rot.append(f"{name} steckt in der Seite")

    # Reproduzierbarkeit: dieselbe Einbettung aus spiel.html + den aktuellen Quellen.
    alt = spiel.read_text(encoding="utf-8")
    neu = einfuegen(alt, "</body>", js_block)
    neu = einfuegen(neu, "</head>", css_block)
    gleich = neu == html
    print(f"  Neu gebaut aus {spiel.name} + aktuellen Quellen: {len(neu):,} Bytes — "
          f"{'gleich' if gleich else 'UNTERSCHIEDLICH'}")
    if not gleich:
        erst = next((k for k in range(min(len(neu), len(html))) if neu[k] != html[k]), min(len(neu), len(html)))
        rot.append(f"die gebaute Seite lässt sich aus den Quellen nicht reproduzieren "
                   f"(erster Unterschied bei Zeichen {erst:,}: Länge {len(neu):,} gegen {len(html):,}) "
                   f"— vermutlich veralteter Bau")

    for f in (css_datei, js_datei):
        if f.stat().st_mtime > datei.stat().st_mtime + 1:
            rot.append(f"{f.name} ist neuer als die gebaute Seite — neu bauen lassen")

    if rot:
        print("  ROT:")
        for x in rot:
            print("    - " + x)
        return 1
    print("  GRÜN: die Anpassung steckt vollständig und in der richtigen Reihenfolge in der Seite.")
    return 0


# ---------------------------------------------------------------- Hauptlauf

def main() -> int:
    ap = argparse.ArgumentParser(description="Netzwerk-Labor auf Handy-Maßen messen",
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("datei", nargs="?", type=Path, default=STANDARD,
                    help="gebautes Spiel (Standard: android/bau/assets/index.html)")
    ap.add_argument("--breite", type=int, help="CSS-Pixel (nur Einzelmessung)")
    ap.add_argument("--hoehe", type=int, help="CSS-Pixel (nur Einzelmessung)")
    ap.add_argument("--dpr", type=float, help="Gerätepixel-Verhältnis (nur Einzelmessung)")
    ap.add_argument("--geraet", help="pixel7 | klein | gross | tablet — Listen mit Komma erlaubt (Lauf)")
    ap.add_argument("--ausrichtung", help="hoch | quer — Listen mit Komma erlaubt (Lauf)")
    ap.add_argument("--vorlage", default="salon", choices=["salon", "praxis"])
    ap.add_argument("--thema", help="hell | dunkel — Listen mit Komma erlaubt (Lauf); "
                                    "Standard: dunkel")
    ap.add_argument("--lauf", action="store_true",
                    help="mehrere Profile in einem Browser messen und eine Tabelle drucken")
    ap.add_argument("--ohne-labor", action="store_true",
                    help="NUR die Startansicht messen (kein Labor laden)")
    ap.add_argument("--mit-start", action="store_true",
                    help="je Profil zusätzlich die Startansicht messen (eigene Tabellenzeile)")
    ap.add_argument("--ziehprobe", action="store_true",
                    help="mit dem Finger ein Kabel ziehen und nachsehen, ob es steckt")
    ap.add_argument("--bedienprobe", action="store_true",
                    help="Navigation, Gerätekategorien und Dock-Reiter anklicken")
    ap.add_argument("--mit-ansichten", action="store_true",
                    help="alle sieben Navigationsansichten einzeln messen (Knöpfe unter 44 px, "
                         "abgeschnittener Text, Elemente außerhalb, JS-Fehler)")
    ap.add_argument("--bild-ansichten", action="store_true",
                    help="je Navigationsansicht ein Bild schreiben (Beleg zu jedem Befund)")
    ap.add_argument("--drehprobe", action="store_true",
                    help="Fenster ohne Neuladen drehen und prüfen, ob der Stand überlebt")
    ap.add_argument("--zoomprobe", action="store_true",
                    help="Zoom-Menü auf „Zoom 100 %\" stellen und nachmessen, ob die klickbaren "
                         "IP-Beschriftungen der Zeichenfläche dann zu klein sind")
    ap.add_argument("--zoomwechsel", action="store_true",
                    help="im Labor von Hand zoomen, dann ein zweites Ticket laden und prüfen, "
                         "ob danach sauber eingepasst ist und der eigene Zoom nicht überschrieben wird")
    ap.add_argument("--statisch", action="store_true",
                    help="ohne Browser prüfen, ob mobil.css/mobil.js in der Seite stecken")
    ap.add_argument("--bild", type=Path, help="Bildschirmfoto der Startansicht (nur Einzelmessung)")
    ap.add_argument("--bild-labor", type=Path, help="Bildschirmfoto des Labors (nur Einzelmessung)")
    ap.add_argument("--bild-gezogen", type=Path, help="Bildschirmfoto nach dem Kabelzug (nur Einzelmessung)")
    ap.add_argument("--bild-ordner", type=Path, default=BILDER_STANDARD,
                    help="Zielordner der Bilder im Lauf (Standard: Nachweise/android)")
    ap.add_argument("--bild-praefix", default="nachher",
                    help="Namensanfang der Bilder im Lauf (Standard: nachher)")
    ap.add_argument("--ohne-bild", action="store_true", help="im Lauf keine Bilder schreiben")
    ap.add_argument("--ziel-frei", default="tablet",
                    help="Geräte, deren Zielwerte nur als Hinweis gedruckt werden. Standard "
                         "tablet: die Telefon-Zielwerte gelten für Telefone; das Tablet behält "
                         "laut android/mobil/mobil.css absichtlich die Schreibtisch-Anordnung. "
                         "Leer lassen (--ziel-frei \"\") wertet alles.")
    ap.add_argument("--ohne-orientierung", action="store_true",
                    help="Bildschirmausrichtung NICHT mitsetzen (nur zur Fehlersuche an der Emulation)")
    ap.add_argument("--json", action="store_true", help="die Messwerte zusätzlich als JSON ausgeben")
    ap.add_argument("--port", type=int, default=9344,
                    help="Steuerport des Browsers; 0 = freien Port wählen (für gleichzeitige Läufe)")
    a = ap.parse_args()

    datei = a.datei.resolve()
    if not datei.is_file():
        raise SystemExit(f"FEHLER: {datei} fehlt — zuerst `python android/bauen.py` laufen lassen.")
    if a.statisch:
        return statisch(datei)

    profile = baue_profile(a)
    einzeln = len(profile) == 1
    for pr in profile:
        pr["bilder"] = bildpfade(a, pr, einzeln)
    port = a.port or freier_port()

    import hashlib
    roh = datei.read_bytes()
    stand = time.strftime("%d.%m.%Y %H:%M:%S", time.localtime(datei.stat().st_mtime))
    print(f"Mobilprobe: {datei.relative_to(PROJEKT)}")
    print(f"  Stand der gemessenen Seite: {len(roh):,} Bytes, SHA256 "
          f"{hashlib.sha256(roh).hexdigest()[:16]}…, geändert {stand}")
    print(f"  gemessen werden {len(profile)} Profil(e): "
          + ", ".join(f"{p['geraet']}/{p['ausrichtung']}/{p['thema']}" for p in profile))
    print(f"  Vorlage {a.vorlage}, Labor {'aus' if a.ohne_labor else 'an'}, "
          f"Ziehprobe {'an' if a.ziehprobe else 'aus'}, "
          f"Bedienprobe {'an' if a.bedienprobe else 'aus'}, Steuerport {port}")

    exe = browser()
    profil = arbeitsordner("nl-mobil-")
    ordner = arbeitsordner("nl-mobilseite-")

    # Arbeitskopie mit Fehlersammler direkt nach <head>, damit Fehler ab dem ersten Byte zählen.
    quelle = datei.read_text(encoding="utf-8")
    probe = ordner / "mobilprobe.html"
    probe.write_text(quelle.replace("<head>", "<head>" + FEHLERSAMMLER, 1), encoding="utf-8")

    p = subprocess.Popen(
        [str(exe), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
         "--disable-sync", "--disable-extensions", "--disable-component-update", "--no-service-autorun",
         "--disable-background-networking", "--disable-client-side-phishing-detection",
         "--disable-features=msEdgeIdentityFluentUI,msEdgeSyncPromo,msImplicitSignin,EdgeCollectionsPrompt",
         "--window-size=%d,%d" % (max(max(x["breite"] for x in profile), 800),
                                  max(max(x["hoehe"] for x in profile), 600)),
         f"--remote-debugging-port={port}", f"--user-data-dir={profil}", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    fehler = []
    ergebnisse = []
    dreh = None
    try:
        url = warte_auf_port(port)
        ws = WS(url)
        ws.fehler = fehler
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        ws.rufen("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
        for nr, pr in enumerate(profile, 1):
            try:
                e = messe_profil(ws, a, pr, probe, nr, len(profile))
            except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError) as e:
                print(f"\nROT: die Verbindung zum Browser ist abgebrochen ({e}).")
                print("  Meist läuft ein zweiter Lauf auf demselben Steuerport — "
                      "dann `--port 0` benutzen. Die Messung dieses Laufs ist unvollständig.")
                return 1
            if e.get("startmess"):
                ergebnisse.append(startzeile(e))
            ergebnisse.append(e)
        if a.drehprobe:
            dreh = drehe(ws, a, probe, profile[0]["geraet"] if profile[0]["geraet"] in GERAETE else "pixel7")
    finally:
        p.terminate()
        try:
            p.wait(timeout=15)
        except subprocess.TimeoutExpired:
            p.kill()
        shutil.rmtree(profil, ignore_errors=True)
        shutil.rmtree(ordner, ignore_errors=True)

    # ---- Ausgabe
    ziel_frei = {x.strip() for x in (a.ziel_frei or "").split(",") if x.strip()}
    alle_rot = []
    for e in ergebnisse:
        e["pruefungen"] = pruefe(e, a)
        e["gewertet"] = e["geraet"] not in ziel_frei
        if not e["gewertet"]:
            for name, ok, text, wert in e["pruefungen"]:
                if not ok:
                    print(f"Hinweis (nicht gewertet, Zielwerte gelten für Telefone) "
                          f"{e['profil']}: {name} — {text}")
    if dreh:
        dreh["rot"] = drucke_dreh(dreh)
        alle_rot.extend("Drehprobe: " + x for x in dreh["rot"])

    if not ergebnisse:
        print("ROT: kein Messergebnis.")
        return 1

    if einzeln:
        print()
        for e in ergebnisse:
            drucke_messung(e)
        if a.bedienprobe:
            for e in ergebnisse:
                drucke_bedienung(e.get("bedienung"))
        if a.mit_ansichten:
            for e in ergebnisse:
                if e.get("ansichten"):
                    print(f"\n  Ansichten {e['profil']} ({e['breite']}×{e['hoehe']}):")
                    drucke_ansichten(e["ansichten"])
        if a.json:
            print("\n" + json.dumps([e["mess"] for e in ergebnisse], ensure_ascii=False))
    else:
        print()
        print("=" * 118)
        print(f"Tabelle: {len(ergebnisse)} Profile, Vorlage {a.vorlage}, "
              f"{'mit' if a.ziehprobe else 'ohne'} Ziehprobe")
        print("=" * 118)

        def leiste(p):
            wl = werkzeugleiste(p["mess"] or {})
            return "—" if not wl else f"{wl['zeilen']}Z/{wl['r']['h']}px"

        def anteil(p):
            x = (p["mess"] or {}).get("flaecheAnteil")
            return "—" if x is None else f"{100 * x:.1f}"

        def kl_tf(p):
            k = (p["mess"] or {}).get("kleinsteTrefferflaeche")
            return "—" if not k else f"{k['w']}×{k['h']}"

        def kabel(p):
            if not a.ziehprobe:
                return "—"
            if p["zugfehler"]:
                return "FEHLER"
            z = p["zug"] or {}
            return f"{z.get('kabelVorher')}→{z.get('kabelNachher')}"

        def ziel(p):
            rot = [x for x in p["pruefungen"] if not x[1]]
            if not p.get("gewertet", True):
                return "frei" if not rot else f"frei({len(rot)})"
            return "GRÜN" if not rot else f"ROT({len(rot)})"

        def einpasst(p):
            ep = p.get("einpassen") or {}
            return "—" if not ep.get("nachher") else f"{ep['nachher']:.4f}"

        spalten = [
            ("Profil", lambda p: p["geraet"]),
            ("Ansicht", lambda p: p.get("ansicht", "labor")),
            ("Ausr", lambda p: p["ausrichtung"]),
            ("Thema", lambda p: p["thema"]),
            ("Flae%", anteil),
            ("totR", lambda p: (p["mess"] or {}).get("toteFlaecheRechts")),
            ("Leiste", leiste),
            ("Zoom", lambda p: (p["mess"] or {}).get("zoom")),
            ("nachEin", einpasst),
            ("Verde%", lambda p: "—" if (p["mess"] or {}).get("verdecktAnteil") is None
             else f"{100 * p['mess']['verdecktAnteil']:.1f}"),
            ("Koll", lambda p: (p["mess"] or {}).get("kollisionZahl")),
            ("kl.TF", kl_tf),
            ("<44", lambda p: (p["mess"] or {}).get("bedienbar", {}).get("unter44")),
            ("Abschn", lambda p: len((p["mess"] or {}).get("abgeschnitten") or [])),
            ("Draus", lambda p: len((p["mess"] or {}).get("ausserhalb") or [])),
            ("Unerr", lambda p: sum(v["unsichtbar"] + v["draussen"]
                                    for v in (p["mess"] or {}).get("erreichbar", {}).values())),
            ("JS", lambda p: len(p["jsFehler"])),
            ("Seite/Bild", lambda p: f"{(p['mess'] or {}).get('groesse', {}).get('w')}/"
                                     f"{(p['mess'] or {}).get('bildschirm', {}).get('w')}"),
            ("Ueberl", lambda p: f"{(p['mess'] or {}).get('ueberlaufBildschirm', {}).get('x')}/"
                                 f"{(p['mess'] or {}).get('ueberlaufBildschirm', {}).get('y')}"),
            ("Kabel", kabel),
            ("nlFab", lambda p: "/".join(str(sum(x.get(k) or 0 for x in
                                          ((p["mess"] or {}).get("mobilElemente") or [])
                                          if x["s"] in (".nl-fab-geraete", ".nl-fab-dock")))
                                        for k in ("da", "sichtbar"))),
            ("Ziel", ziel),
        ]
        tabelle(ergebnisse, spalten)
        print("\n  Flae% = Zeichenfläche in % der BILDSCHIRMbreite · totR = tote Fläche rechts in px · "
              "Leiste = Zeilen an den Knöpfen/Höhe")
        print("  Zoom / nachEin = Zoom nach dem Laden / Zoom nach „Alles einpassen“ (das Spiel "
              "selbst gibt das Maximum vor)")
        print("  Kl.TF = kleinste Trefferfläche · Abschn = abgeschnittene Elemente · "
              "Draus = ragt aus dem Bildschirm")
        print("  Seite/Bild = Layoutbreite/Bildschirmbreite (ungleich = die Seite ist breiter als das "
              "Telefon) · Ueberl = Überlauf gegen den Bildschirm in px")
        print("  nlFab = .nl-fab-geraete/.nl-fab-dock im DOM / davon sichtbar")
        print("  Unerr = unsichtbare oder ganz draußen liegende Bedienelemente im gemessenen Zustand "
              "(ein geschlossenes Blatt ist kein Befund — siehe --bedienprobe)")
        if ziel_frei:
            print(f"  frei = gemessen, aber nicht gewertet (Telefon-Zielwerte gelten nicht für "
                  f"{', '.join(sorted(ziel_frei))})")

        print("\nVerletzte Zielwerte je Profil:")
        for e in ergebnisse:
            rot = [(n, t) for n, ok, t, _ in e["pruefungen"] if not ok]
            frei = "" if e.get("gewertet", True) else "   [nicht gewertet]"
            kopf = f"  {e['profil']} ({e['breite']}×{e['hoehe']}){frei}"
            if not rot:
                print(f"{kopf}: GRÜN — alle Zielwerte gehalten")
            else:
                print(f"{kopf}: {len(rot)} verletzt")
                for n, t in rot:
                    print(f"      - {n}: {t}")
        if a.bedienprobe:
            for e in ergebnisse:
                if e.get("bedienung"):
                    print(f"\n  Bedienprobe {e['profil']}:")
                    drucke_bedienung(e["bedienung"])
        if a.zoomprobe:
            for e in ergebnisse:
                if e.get("zoomprobe"):
                    print(f"\n  Grenze bei Zoom 100 % — {e['profil']} ({e['breite']}×{e['hoehe']}):")
                    drucke_zoomprobe(e["zoomprobe"])
        if a.zoomwechsel:
            print("\n  Zoomwechsel (eigener Zoom, dann zweites Ticket):")
            for e in ergebnisse:
                if e.get("zoomwechsel"):
                    print(f"    {e['profil']}:")
                    drucke_zoomwechsel(e["zoomwechsel"])
        if a.mit_ansichten:
            for e in ergebnisse:
                if e.get("ansichten"):
                    print(f"\n  Ansichten {e['profil']} ({e['breite']}×{e['hoehe']}):")
                    drucke_ansichten(e["ansichten"])

    # ---- Zusammenfassung
    kriterien = []
    for e in ergebnisse:
        for n, ok, t, w in e["pruefungen"]:
            if n not in kriterien:
                kriterien.append(n)
    gewertete = [e for e in ergebnisse if e.get("gewertet", True)]
    print(f"\nGehalten (grüne Profile je Zielwert; nur gewertete Profile: {len(gewertete)}"
          + (f", nicht gewertet: {len(ergebnisse) - len(gewertete)}" if len(gewertete) != len(ergebnisse) else "")
          + "):")
    for n in kriterien:
        zeilen = [e for e in gewertete if any(x[0] == n for x in e["pruefungen"])]
        if not zeilen:
            continue
        gruen = sum(1 for e in zeilen if any(x[0] == n and x[1] for x in e["pruefungen"]))
        print(f"  {n:<24} {gruen}/{len(zeilen)}")
    if "Kabelzug" not in kriterien:
        print("  Kabelzug                 nicht geprüft (--ziehprobe nicht gesetzt)")
    if not any(k.startswith("Zeichenfläche") or k.startswith("Zoom") for k in kriterien):
        print("  Zeichenfläche/Zoom       nicht geprüft (keine sichtbare Zeichenfläche gemessen)")
    if "Alle Ansichten" not in kriterien:
        print("  Alle Ansichten           nicht geprüft (--mit-ansichten nicht gesetzt)")
    if a.zoomprobe:
        print("  Grenze bei Zoom 100 %    siehe Sektion — kein Zielwert (die IP-Beschriftungen "
              "der Zeichenfläche skalieren mit dem Zoom, auch am Schreibtisch)")
    if "Trefferflächen" in kriterien and not a.mit_start and not a.ohne_labor:
        print("  Startansicht             nicht geprüft (--mit-start nicht gesetzt)")

    for e in gewertete:
        for n, ok, t, w in e["pruefungen"]:
            if not ok:
                alle_rot.append(f"{e['profil']} ({e.get('ansicht', 'labor')}): {n} — {t}")
    if a.json:
        print("\n" + json.dumps([{k: v for k, v in e.items() if k != "mess"} | {"mess": e["mess"]}
                                 for e in ergebnisse], ensure_ascii=False))

    if alle_rot:
        print(f"\nROT: {len(alle_rot)} Verstöße gegen die Zielwerte "
              f"in {sum(1 for e in gewertete if any(not ok for _, ok, _, _ in e['pruefungen']))}"
              f"/{len(gewertete)} gewerteten Profilen:")
        for x in alle_rot:
            print("  - " + x)
        return 1
    print(f"\nGRÜN: alle {len(gewertete)} gewerteten Profile halten die Zielwerte.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
