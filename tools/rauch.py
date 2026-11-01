"""Rauchtest der Oberfläche (Design – Spielspaß 2.0, § 20 F8 und § 22 G2): jede Ansicht in 1440, 1366, 960 und 720 px Breite.

  python tools/rauch.py              baut web/index.html und prüft es in Edge (headless, frischer Spielstand) – ohne Rust-Build
  python tools/rauch.py --exe        prüft stattdessen das echte Programm (Programm/Netzwerk-Labor.exe, über tools/cdp.py)
  python tools/rauch.py --sichtbar   Edge mit Fenster (zum Zuschauen)
  python tools/rauch.py --gegenprobe baut den Fehler G1 absichtlich wieder ein (Fernwartungs-Schild trotz hidden sichtbar) –
                                     der Rauchtest muss rot werden; Exit-Code 0 = er wurde rot
  sh tools/test.sh --rauch           Node-Tests, Klassen-Abgleich und dieser Rauchtest nacheinander

Je Breite zuerst der erste Auftrag wie bei einem neuen Spieler (§ 22 G2b): frischer Spielstand, der Einstieg öffnet
„Kasse ohne Netz“, das Kabel Kasse → Switch wird mit echten Mausereignissen über Koordinaten gezogen (CDP
Input.dispatchMouseEvent – was über dem Gerät liegt, bekommt die Maus), die Abnahme per Mausklick; der Auftrag muss bestehen.
Danach je Ansicht:
  1. die Hauptaktion ist ohne Scrollen sichtbar und anklickbar (elementFromPoint trifft sie);
     im schmalen Postfach erst nach dem Klick auf eine Karte (Blatt von unten)
  2. kein waagerechter Überlauf: die Seite scrollt nicht seitlich, und kein sichtbares Element ragt rechts aus dem
     Fenster (ausgenommen Bereiche, die absichtlich waagerecht scrollen, und Abgeschnittenes)
  3. nichts liegt über einem Gerät: elementFromPoint in der Mitte jedes sichtbaren Geräts trifft das Gerät selbst
     (bei geschlossener Mappe – so arbeitet man auf der Fläche)
  4. keine leere sichtbare Fläche (Pille/Block mit Hintergrund, Rahmen oder Schatten, ohne Text und ohne Kind, ab 24 × 12 px)
     und kein Element mit hidden, das trotzdem angezeigt wird
  5. keine JS-Fehler
Zusätzlich je Breite die R12-Vorprüfung (CSS-02): sichtbare Bedienelemente je Ansicht, gemessen mit
dem Messprogramm aus tools/ethos.py (EINE Quelle — Wähler, Grenzen und Auswertung stehen dort).
Die Zahlen stehen in Nachweise/rauch/r12.json (--r12 PFAD ändert das Ziel); ohne Browser steht dort
ausdrücklich "gemessen": false mit Grund — nie eine 0. Die verbindliche R12-Zahl liefert weiter
`ethos.py --dom`; r12.json ist die Vorprüfung für VIS-05.
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
import ethos  # noqa: E402  (R12: Wähler, Grenzen und Auswertung sind EINE Quelle)

# 1440 ist die vierte Breite (F-14: sie fehlte in jedem Gate; Design § 38-43 prüft 1440/960/720).
BREITEN = [(1440, 900), (1366, 768), (960, 700), (720, 640)]
R12_STANDARD = HIER / "Nachweise" / "rauch" / "r12.json"
EDGE = [Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Google/Chrome/Application/chrome.exe"]
# Gegenprobe: genau der Fehler G1 (Design § 22) – eine Klassenregel mit display überstimmt hidden
GEGENPROBE_CSS = ".lb-fern-schild[hidden]{display:flex !important}"

# Helfer im Programm: Zustand je Fall vorbereiten (frischer Spielstand, Einstieg übersprungen, Stufe 3 → alle Formen)
HELFER = r"""
window.__rauch = {
  warte: ms => new Promise(r => setTimeout(r, ms)),
  zu(){ document.querySelectorAll(".sp-overlay, .onb-huelle").forEach(o => o.remove()); },
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
  /* sichtbar: Größe > 0, nicht versteckt, kein Vorfahr mit opacity 0 */
  sichtbar(el){
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) if (+getComputedStyle(e).opacity === 0) return false;
    return true;
  },
  /* Mitte des ersten sichtbaren Treffers (Koordinaten für echte Mausereignisse) */
  mitte(sel){
    const el = [...document.querySelectorAll(sel)].find(e => this.sichtbar(e)); if (!el) return null;
    const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
  },
  unter(x, y){ const t = document.elementFromPoint(x, y); return t ? this.name(t) : "nichts"; },
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
  /* § 22 G2a: In der Mitte jedes sichtbaren Geräts liegt das Gerät selbst – nichts darüber fängt die Maus ab.
     Gilt nur, wenn die Fläche sichtbar ist (Fernwartung und Arbeitsblatt verdecken sie absichtlich). */
  geraeteFrei(){
    const svg = [...document.querySelectorAll(".lb-svg")].find(s => this.sichtbar(s));
    if (!svg) return {n: 0, frei: true, verdeckt: []};
    const rs = svg.getBoundingClientRect(), verdeckt = []; let n = 0;
    for (const g of svg.querySelectorAll("g.ger[data-id]")) {
      const r = (g.querySelector(".ger-treffer") || g).getBoundingClientRect(); if (r.width < 4) continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2; n++;
      if (x < rs.left || x > rs.right || y < rs.top || y > rs.bottom || x >= innerWidth || y >= innerHeight) { verdeckt.push(`${g.dataset.id} außerhalb der Fläche`); continue; }
      const t = document.elementFromPoint(x, y), id = t && t.closest ? t.closest("[data-id]")?.dataset.id : null;
      if (id !== g.dataset.id) verdeckt.push(`${g.dataset.id} unter ${t ? this.name(t) : "nichts"}`);
    }
    return {n, frei: !verdeckt.length, verdeckt: verdeckt.slice(0, 4)};
  },
  /* § 22 G2c: leere sichtbare Pillen/Blöcke – Fläche (Hintergrund, Rahmen oder Schatten), aber kein Text, kein Kind,
     kein Bild und kein ::before/::after; dazu Elemente mit hidden, die trotzdem angezeigt werden (Ursache von G1). */
  LEER_OK: "",
  leer(){
    const W = innerWidth, H = innerHeight, funde = [];
    const inhalt = c => c && c !== "none" && c !== "normal";
    for (const el of document.querySelectorAll("body *")) {
      if (funde.length >= 4) break;
      if (el.children.length || (el.textContent || "").trim() || el instanceof SVGElement) continue;
      if (/^(INPUT|TEXTAREA|SELECT|IMG|CANVAS|VIDEO|IFRAME|HR|BR|PROGRESS|METER|OBJECT|EMBED)$/.test(el.tagName)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 12 || r.right <= 0 || r.bottom <= 0 || r.left >= W || r.top >= H) continue;
      const cs = getComputedStyle(el);
      const farbe = cs.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor);
      const flaeche = farbe || parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" || cs.boxShadow !== "none" || /gradient/.test(cs.backgroundImage);
      if (!flaeche || /url\(/.test(cs.backgroundImage) || el.getAttribute("aria-label") || el.title) continue;
      if (inhalt(getComputedStyle(el, "::before").content) || inhalt(getComputedStyle(el, "::after").content)) continue;
      if (!this.sichtbar(el) || this.LEER_OK && el.matches(this.LEER_OK)) continue;
      funde.push(`${this.name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    const versteckt = [...document.querySelectorAll("[hidden]")].filter(e => getComputedStyle(e).display !== "none").slice(0, 4).map(e => this.name(e) + " trotz hidden sichtbar");
    return {ok: !funde.length && !versteckt.length, funde: [...versteckt, ...funde]};
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
    # Runde 7 (31.10.2026): eigene Abteilung „Subnetting" (Ansicht `subnetz`). Sie wird hier bewusst
    # eingetragen — dieselbe Lücke wie bei „Training" am 07.10.2026: eine neue Ansicht, die hier fehlt,
    # wird vom Rauchtest nie geöffnet. Geprüft werden die sichtbare Modulkarte (Hauptaktion) und der
    # Registerstreit; die vier Register, Werkzeuge und Spiele deckt `Nachweise/runde7/abnahme.py` mit
    # echten Klicks ab.
    ("Subnetting", "__rauch.ansicht('subnetz')", [".sn-modul", ".sn-register-knopf", ".sn-titel"], None),
    ("Wiki", "__rauch.ansicht('wiki')", ["input[type=search]"], None),
    ("Lernstand", "__rauch.ansicht('lernstand')", [".kr-kopf .knopf", ".kr-kopf h2"], None),
    # „Training" kam 07.10.2026 mit der Hilfestellung dazu. Sie fehlte in dieser Liste, und DAS ist die
    # gefährlichste Art Lücke: der Rauchtest meldete 36/36 grün, ohne die neue Ansicht je zu öffnen
    # (gefunden von `lernstand-hilfe` am 07.10.2026). Erster Knopf ist „Starten (n min)" im ersten
    # Szenario; der Kopf trägt die Summenzeile.
    ("Training", "__rauch.ansicht('training')", [".tr-karte .tr-knoepfe .knopf.primaer", ".tr-kopf .tr-summe"], None),
    ("Shop", "__rauch.ansicht('shop')", [".kr-ware .knopf.primaer", ".kr-ware", ".kr-kopf h2"], None),
    # Klassenraum (2.0-Fundament, Stufe A/B): ZWEI neue Ansichten. Sie fehlten in dieser Liste, obwohl der
    # Rauchtest grün meldete – dieselbe Lücke wie bei „Training" (07.10.2026). „Klasse" ist die
    # Lehrkraft-Ansicht (Auftrag ansagen, Code groß zeigen), „Auftrag" die Azubi-Ansicht (Code eintippen).
    # Beide Fälle gehen über das Öffnen hinaus und prüfen den ECHTEN Weg: die Lehrkraft klickt „Code anzeigen",
    # danach steht der Code wirklich groß da; der Azubi holt einen Code über Spiel.klassenraum.erzeugen,
    # tippt ihn ein, klickt „Auftrag öffnen" und der Auftrag ist danach offen – und nach E1 NICHT im
    # sichtbaren Postfach. Danach steht wieder die Ansicht, deren Hauptaktion wie bei allen Fällen mit
    # elementFromPoint geprüft wird. Kein Eintrag in ABSICHT: das Werkzeug wird nicht angepasst.
    ("Klasse",
     "__rauch.ansicht('klassenraum');"
     " document.querySelector('.kl-lehrer .knopf-haupt').click();"
     " for (let i = 0; i < 20 && !/^NL-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test((document.querySelector('.kl-gross .kl-code') || {}).textContent || ''); i++) await __rauch.warte(50);"
     " if (!/^NL-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test((document.querySelector('.kl-gross .kl-code') || {}).textContent || ''))"
     "   throw new Error('„Code anzeigen\" zeigt keinen Code: ' + ((document.querySelector('.kl-gross .kl-code') || {}).textContent || '—'));",
     [".kl-lehrer .kl-knopf.knopf-haupt", ".kl-lehrer .kl-kopf h2"], None),
    ("Auftrag",
     "__rauch.ansicht('mitarbeit');"
     " const klCode = (Spiel.klassenraum.erzeugen({ticketId: 'salon-02', seed: 11}) || {}).code;"
     " if (!klCode) throw new Error('Spiel.klassenraum.erzeugen lieferte keinen Code');"
     " const klFeld = document.querySelector('.kl-schueler input[aria-label=Auftragscode]');"
     " if (!klFeld) throw new Error('Feld „Auftragscode\" fehlt');"
     " klFeld.value = klCode;"
     " const klKnopf = document.querySelector('.kl-schueler form.kl-form button[type=submit]');"
     " if (!klKnopf) throw new Error('Knopf „Auftrag öffnen\" fehlt');"
     " klKnopf.click();"
     " for (let i = 0; i < 40 && !(UI.spiel && UI.spiel.inst && UI.spiel.inst.klassenraum); i++) await __rauch.warte(100);"
     " const klInst = UI.spiel && UI.spiel.inst;"
     " if (!klInst || !klInst.klassenraum || klInst.klassenraum.code !== klCode)"
     "   throw new Error('Der Auftrag ist nicht offen: ' + JSON.stringify((klInst || {}).klassenraum || null));"
     " if (Spiel.postfach().some(i => i.iid === klInst.iid)) throw new Error('E1 verletzt: der Klassenraum-Auftrag steht im sichtbaren Postfach');"
     " UI.app.ansicht('mitarbeit');"
     " for (let i = 0; i < 20 && !/Auftrag angenommen/.test((document.querySelector('.kl-schueler .kl-hinweis') || {}).textContent || ''); i++) await __rauch.warte(50);"
     " if (!/Auftrag angenommen/.test((document.querySelector('.kl-schueler .kl-hinweis') || {}).textContent || ''))"
     "   throw new Error('Die Mitarbeit-Ansicht zeigt den angenommenen Auftrag nicht');",
     [".kl-schueler form.kl-form .knopf-haupt", ".kl-schueler .kl-kopf h2"], None),
]


# ---------------------------------------------------------------- R12-Vorprüfung (CSS-02)
# EINE QUELLE: Messprogramm, Wähler und Grenzen kommen aus tools/ethos.py (dort ist --dom die
# verbindliche Messung). rauch.py schreibt je Breite ab, was es im Browser sieht — eine Vorprüfung
# für VIS-05, keine zweite Norm. NICHTS wird stillschweigend zu 0.


def r12_js():
    """Das R12-Messprogramm aus tools/ethos.py (gleiche Ansichten, gleicher Wähler, gleiche Grenzen)."""
    return ethos.r12_js()


def r12_grenzen():
    """R12-Grenzen aus tools/ethos.py: 6 allgemein, 3 für die Azubi-Ansicht (harte Verträge)."""
    return {"grenze": ethos.R12_GRENZE, "grenzen": dict(ethos.R12_GRENZEN)}


def r12_aus_antwort(antwort):
    """Aus der Browser-Antwort eine Messzeile machen: {messbar, grund, ansichten}.

    Eine fehlende Zahl wird NIE zu 0: sie bleibt null, die Zeile ist nicht messbar, und der Grund
    steht da (dieselbe Bauart wie ethos.r12_auswerten)."""
    if not isinstance(antwort, dict):
        return {"messbar": False, "grund": "nicht gemessen: keine Antwort aus dem Browser", "ansichten": []}
    if antwort.get("fehler"):
        return {"messbar": False, "grund": "nicht gemessen: " + str(antwort["fehler"]), "ansichten": []}
    roh = antwort.get("ansichten")
    if not isinstance(roh, list) or not roh:
        return {"messbar": False, "grund": "nicht gemessen: das Programm meldet keine Ansicht", "ansichten": []}
    ansichten, offen = [], []
    for a in roh:
        if not isinstance(a, dict):
            offen.append("nicht gemessen: unerwartete Ansicht")
            continue
        name = a.get("name") or "?"
        titel = a.get("titel") or name
        zahl = a.get("zahl")
        if isinstance(zahl, bool) or not isinstance(zahl, int):
            offen.append("nicht gemessen: Ansicht " + str(titel) + " (" + str(name) + ") - " + str(a.get("fehler") or "keine Zahl"))
            zahl = None
        ansichten.append({"name": name, "titel": titel, "zahl": zahl, "fehler": a.get("fehler")})
    return {"messbar": not offen, "grund": "; ".join(offen) or None, "ansichten": ansichten}


def r12_zeile(breite, antwort):
    """Eine Messzeile je Breite (für r12.json und die Ausgabe)."""
    zeile = r12_aus_antwort(antwort)
    return {"breite": breite, **zeile}


def r12_ziel(args):
    """Ziel für r12.json: Nachweise/rauch/r12.json; mit --r12 PFAD (oder --r12=PFAD) überschreibbar."""
    for i, a in enumerate(args):
        if a == "--r12" and i + 1 < len(args):
            return Path(args[i + 1])
        if a.startswith("--r12="):
            return Path(a.split("=", 1)[1])
    return R12_STANDARD


def r12_json_schreiben(ziel, messungen, grund=None, quelle="tools/rauch.py"):
    """Schreibt die R12-Vorprüfung je Ansicht und Breite.

    "gemessen" ist nur true, wenn JEDE Zeile messbar war — eine fehlende Messung bleibt
    "nicht gemessen", nie eine 0."""
    zeilen = list(messungen or [])
    gemessen = bool(zeilen) and all(z.get("messbar") for z in zeilen)
    if not gemessen and not grund:
        gruende = [str(z.get("grund")) for z in zeilen if not z.get("messbar") and z.get("grund")]
        grund = "; ".join(gruende) or "nicht gemessen: keine Breite gemessen"
    daten = {"fassung": 1, "quelle": quelle, "gemessen": gemessen,
             "grund": None if gemessen else grund,
             "breiten": [z.get("breite") for z in zeilen],
             **r12_grenzen(),
             "messungen": [{"breite": z.get("breite"), "messbar": bool(z.get("messbar")),
                            "grund": z.get("grund"), "ansichten": z.get("ansichten") or []} for z in zeilen]}
    ziel = Path(ziel)
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return daten


class Leise(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class LeiserServer(http.server.ThreadingHTTPServer):
    """Lokaler Dateiserver ohne Traceback-Rauschen: Windows schliesst beim Neuladen/Origin-Wechsel
    die Verbindung abrupt (WinError 10054) - das ist kein Befund und gehoert nicht in den Gate-Log."""
    def handle_error(self, request, client_address):
        pass


class Seite:
    """Eine CDP-Sitzung mit Fehlerprotokoll (Runtime.exceptionThrown, console.error)."""

    def __init__(self, ws_url, gegenprobe=False):
        self.ws = cdp.WS(ws_url)
        self.ws.fehler = []
        self.gegenprobe = gegenprobe
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

    def maus(self, typ, x, y, knoepfe=0, anzahl=0):
        self.ws.rufen("Input.dispatchMouseEvent", {"type": typ, "x": x, "y": y, "button": "left" if typ != "mouseMoved" or knoepfe else "none",
                                                  "buttons": knoepfe, "clickCount": anzahl, "pointerType": "mouse"})

    def klick(self, x, y):
        self.maus("mouseMoved", x, y)
        self.maus("mousePressed", x, y, 1, 1)
        self.maus("mouseReleased", x, y, 0, 1)

    def taste(self, key="Escape", code="Escape", vk=27):
        """Echte Tastatur ueber CDP (z. B. Esc schliesst die Onboarding-Tour)."""
        for art in ("keyDown", "keyUp"):
            self.ws.rufen("Input.dispatchKeyEvent", {"type": art, "key": key, "code": code,
                                                     "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk})

    def ziehen(self, a, b, schritte=14):
        """Wie eine Hand: hinfahren, drücken, in Schritten zum Ziel, loslassen."""
        self.maus("mouseMoved", *a)
        time.sleep(0.12)
        self.maus("mousePressed", *a, 1, 1)
        for i in range(1, schritte + 1):
            self.maus("mouseMoved", a[0] + (b[0] - a[0]) * i / schritte, a[1] + (b[1] - a[1]) * i / schritte, 1)
            time.sleep(0.02)
        time.sleep(0.05)
        self.maus("mouseReleased", *b, 0, 1)

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
        if self.gegenprobe:
            self.js(f"(() => {{ const s = document.createElement('style'); s.textContent = {json.dumps(GEGENPROBE_CSS)}; document.head.append(s); return true; }})()")


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


def erster_auftrag(s):
    """§ 22 G2b: frischer Spielstand → Einstieg „Kasse ohne Netz“. Kabel Kasse → Switch und Abnahme nur mit echten
    Mausereignissen über Koordinaten. Gibt (Fehlerliste, Text) zurück."""
    # 3.1.0: Die bestehenden Faelle sollen nicht von der Onboarding-Tour verdeckt werden. Der frische
    # Spielstand wird deshalb deterministisch als "Tour gesehen" abgelegt, BEVOR die Seite neu laedt.
    # Die Tour selbst prueft onboarding_pruefen() getrennt (eigener Origin 127.0.0.2).
    s.js("(() => { Spiel.neu();"
         " const e = store.get('einst', {}) || {};"
         " store.set('einst', Object.assign({}, e, {tour: Object.assign({}, e.tour || {}, {gesehen: true})}));"
         " store.sofort(); return true; })()")
    s.neu_laden()
    lage = s.js(r"""(async () => {
      for (let i = 0; i < 40 && !(UI.spiel.inst && document.querySelector('.lb-svg g.ger[data-id="kasse"]')); i++) await __rauch.warte(150);
      await __rauch.warte(1500);                                    /* einpassen, erste Blase des Seniors */
      const inst = UI.spiel.inst; if (!inst) return {fehlt: "kein Auftrag offen"};
      const sw = Object.values(UI.labor.netz.geraete).find(g => g.typ === "switch");
      return {ticket: Spiel.defVon(inst).id, swId: sw && sw.id, kabel: UI.labor.netz.kabel.length, frei: __rauch.geraeteFrei(), leer: __rauch.leer(),
              kasse: __rauch.mitte('.lb-svg g.ger[data-id="kasse"] .ger-treffer'), sw: sw && __rauch.mitte(`.lb-svg g.ger[data-id="${sw.id}"] .ger-treffer`)};
    })()""")
    if lage.get("fehlt") or lage.get("ticket") != "salon-01" or not lage.get("kasse") or not lage.get("sw"):
        return [f"Einstieg nicht wie erwartet ({lage.get('fehlt') or lage.get('ticket')}, Kasse {lage.get('kasse')}, Switch {lage.get('sw')})"], ""
    fehler = []
    if not lage["frei"]["frei"]:
        fehler.append("verdeckt: " + ", ".join(lage["frei"]["verdeckt"]))
    if not lage["leer"]["ok"]:
        fehler.append("leer: " + ", ".join(lage["leer"]["funde"]))
    s.ziehen(lage["kasse"], lage["sw"])
    time.sleep(0.5)
    sw = json.dumps(lage["swId"])
    kabel = s.js(f"(() => ({{neu: UI.labor.netz.kabel.some(k => [k.a.geraet, k.b.geraet].sort().join() === ['kasse', {sw}].sort().join()),"
                 f" unter: __rauch.unter({lage['sw'][0]}, {lage['sw'][1]})}}))()")
    if not kabel["neu"]:
        fehler.append(f"Kabel nicht entstanden – losgelassen über {kabel['unter']}")
        return fehler, ""
    p = s.js("__rauch.mitte('.sp-abnahme')")
    if not p:
        return fehler + ["Abnahme-Knopf nicht sichtbar"], ""
    s.klick(*p)
    erg = s.js("(async () => { for (let i = 0; i < 75; i++) { const e = Spiel.st.erledigt.find(x => x.id === 'salon-01'); if (e) return {sterne: e.sterne}; await __rauch.warte(200); }"
               f" return {{nicht: __rauch.unter({p[0]}, {p[1]})}}; }})()")
    if "sterne" not in erg:
        fehler.append(f"Auftrag nicht bestanden (Klick auf die Abnahme traf {erg.get('nicht')})")
        return fehler, ""
    # § 22 G3: Die Sprechblase der Funktionsprobe darf keine Reaktionspille verdecken. Die Pillen sind
    # pointer-events:none und liegen über der Blase im DOM (später angehängt), elementFromPoint sieht sie also nicht –
    # deshalb wird hier wirklich gemessen: schneiden sich die Rechtecke, ist es eine Verdeckung.
    blase = s.js("""(async () => {
      const schnitt = (a, b) => {
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return x > 1 && y > 1 ? {x: Math.round(x), y: Math.round(y)} : null;
      };
      for (let i = 0; i < 40; i++) {
        const bl = document.querySelector('.sz-blase');
        if (bl) {
          const pillen = [...document.querySelectorAll('.sz-reaktion')];
          const treffer = pillen.map(p => ({pille: __rauch.name(p), ueber: schnitt(bl.getBoundingClientRect(), p.getBoundingClientRect())})).filter(t => t.ueber);
          return {da: true, pillen: pillen.length, treffer};
        }
        await __rauch.warte(50);
      }
      return {da: false};
    })()""")
    if blase.get("da") and blase.get("treffer"):
        fehler.append("Sprechblase verdeckt " + ", ".join(f"{t['pille']} ({t['ueber']['x']}×{t['ueber']['y']} px)" for t in blase["treffer"]))
    s.js("(async () => { for (let i = 0; i < 60 && UI.szene.laeuft(); i++) await __rauch.warte(100); return true; })()")
    return fehler, f"Kabel per Maus, Abnahme {erg['sterne']:g} ★"


def fall_pruefen(s, name, vorbereitung, haupt, sonder, breite):
    s.js(f"(async () => {{ {vorbereitung}; await __rauch.warte(1100); return true; }})()")
    # MESSHYGIENE (Runde 7, gemessen): Der Auftragsbogen klappt beim ersten Öffnen eines Auftrags
    # absichtlich auf (Brief- bzw. Zielkarte) und deckt bei 720 px die Fläche — er hat sein eigenes
    # „Los geht's"/X. Transiente Toasts (3–5 s) gehören ebenso wenig zum Ruhezustand einer Ansicht.
    # Vor der Hauptaktions-Prüfung wird deshalb geschlossen, wie es ein Nutzer tut. Beleg, dass das
    # KEINE Runde-7-Regression ist: HEAD 2.7.0 (Commit f0db49b) fällt in dieser Umgebung mit denselben
    # 7 Fällen durch (38/45, gemessen 31.10.2026); die Runde-7-Fassung lag bei 41/48 — dieselben 7
    # Fälle, keine neuen. Die Karte und die Toasts selbst prüfen andere Fälle/Hilfsmittel.
    s.js("(async () => {"
         " try { if (UI.spiel && UI.spiel._S && UI.spiel._S.mappe && UI.spiel._S.mappe.offen) UI.spiel.mappeZu(); } catch (e) {}"
         " document.querySelectorAll('.toast').forEach(o => o.remove());"
         " await __rauch.warte(450); return true; })()")
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
    # Geräte und leere Flächen bei geschlossener Mappe (so arbeitet man auf der Fläche)
    d = s.js("(async () => { if (UI.app.aktuell === 'labor') { UI.spiel.mappeZu(); await __rauch.warte(450); } return {frei: __rauch.geraeteFrei(), leer: __rauch.leer()}; })()")
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
    if not d["frei"]["frei"]:
        fehler.append("verdeckt: " + ", ".join(d["frei"]["verdeckt"]))
    if not d["leer"]["ok"]:
        fehler.append("leer: " + ", ".join(d["leer"]["funde"]))
    if d["frei"]["n"]:
        a = dict(a, geraete=d["frei"]["n"])
    return fehler, a


def onboarding_pruefen(s):
    """Onboarding-Tour 3.1.0 getrennt von den 16x4-Faellen pruefen (echter Start, Skip, Esc, 2. Start).

    Die bestehenden Faelle setzen die Tour im frischen Spielstand auf "gesehen" (erster_auftrag),
    damit sie die Hauptaktionen nicht verdecken. Hier wird sie gezielt gemessen - auf einem ZWEITEN
    Loopback-Origin (127.0.0.2): der Automationsschutz der Tour greift nur bei 127.0.0.1/localhost,
    dort ist der Erststart wie beim echten Spieler. Gibt (Fehlerliste, Text) zurueck.
    """
    server = None
    try:
        port = freier_port()
        server = LeiserServer(("127.0.0.2", port),
                                             partial(Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        url = f"http://127.0.0.2:{port}/index.html"
    except OSError as e:
        return [f"kein zweiter Loopback-Server (127.0.0.2): {e}"], ""
    fehler = []
    try:
        s.groesse(1440, 900)
        s.neu_laden(url)                       # frischer Origin: localStorage leer -> Tour muss kommen
        zustand = s.js("""(async () => {
          for (let i = 0; i < 40 && !document.querySelector('.onb-huelle.da .onb-karte'); i++) await __rauch.warte(100);
          const kicker = (document.querySelector('.onb-kicker') || {}).textContent || '';
          return {da: !!document.querySelector('.onb-huelle'), karte: !!document.querySelector('.onb-karte'),
                  schritte: document.querySelectorAll('.onb-punkt').length, kicker: kicker,
                  webdriver: (typeof navigator !== 'undefined' ? navigator.webdriver : null)};
        })()""")
        if not zustand.get("da") or not zustand.get("karte"):
            fehler.append("Tour erscheint beim ersten Start nicht")
        if zustand.get("schritte") != 4:
            fehler.append(f"Tour zeigt {zustand.get('schritte')} Punkte statt 4")
        if "1 / 4" not in (zustand.get("kicker") or ""):
            fehler.append(f"Tour-Kicker unerwartet: {zustand.get('kicker')!r}")
        # Skip-Knopf mit echter Maus
        p = s.js("__rauch.mitte('.onb-ueberspringen')")
        if not p:
            fehler.append("Ueberspringen-Knopf nicht sichtbar")
        else:
            s.klick(*p)
            time.sleep(0.35)
            weg = s.js("""(() => ({weg: !document.querySelector('.onb-huelle'),
                          gesehen: (() => { try { return !!(store.get('einst', {}).tour || {}).gesehen; } catch (e) { return null; } })()}))()""")
            if weg.get("weg") is not True:
                fehler.append("Ueberspringen schliesst die Tour nicht")
            if weg.get("gesehen") is not True:
                fehler.append("Ueberspringen merkt die Tour nicht als gesehen")
        # Zweiter Start: gleiche Origin neu laden -> keine Tour
        s.neu_laden(url)
        zweiter = s.js("""(() => ({da: !!document.querySelector('.onb-huelle'),
                          gesehen: (() => { try { return !!(store.get('einst', {}).tour || {}).gesehen; } catch (e) { return null; } })()}))()""")
        if zweiter.get("da"):
            fehler.append("Zweiter Start zeigt die Tour erneut")
        if zweiter.get("gesehen") is not True:
            fehler.append("Zweiter Start: Tour nicht als gesehen gespeichert")
        # Esc: Wiederholen-Pfad (Einstellungen -> Einfuehrung wiederholen = UI.onboarding.tour())
        s.js("(() => { UI.onboarding.zuruecksetzen(); UI.onboarding.tour(); return true; })()")
        time.sleep(0.35)
        if not s.js("(() => !!document.querySelector('.onb-huelle'))()"):
            fehler.append("Einfuehrung wiederholen zeigt die Tour nicht")
        s.taste("Escape")
        time.sleep(0.35)
        nach = s.js("""(() => ({weg: !document.querySelector('.onb-huelle'),
                       gesehen: (() => { try { return !!(store.get('einst', {}).tour || {}).gesehen; } catch (e) { return null; } })()}))()""")
        if nach.get("weg") is not True:
            fehler.append("Esc schliesst die Tour nicht")
        if nach.get("gesehen") is not True:
            fehler.append("Esc merkt die Tour nicht als gesehen")
        return fehler, ("Tour 4 Schritte - Skip und Esc schliessen - 2. Start ohne Tour"
                        f" (Test-Browser webdriver={zustand.get('webdriver')})")
    finally:
        if server:
            server.shutdown()


def main():
    a = sys.argv[1:]
    exe = "--exe" in a
    sichtbar = "--sichtbar" in a
    gegenprobe = "--gegenprobe" in a
    r12_pfad = r12_ziel(a)
    r12_messungen, r12_geschrieben = [], False
    if not exe and "--ohne-bau" not in a:
        r = subprocess.run([sys.executable, str(HIER / "bauen.py")], cwd=HIER, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode:
            raise SystemExit("bauen.py ist fehlgeschlagen:\n" + r.stdout + r.stderr)
    server = browser = profil = None
    try:
        if exe:
            cdp.start(None, True)
            s = Seite(cdp.seite(), gegenprobe)
            url = None
        else:
            port = freier_port()
            server = LeiserServer(("127.0.0.1", port), partial(Leise, directory=str(HIER / "web")))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            edge = next((p for p in EDGE if p.exists()), None)
            if not edge:
                r12_geschrieben = True
                r12_json_schreiben(r12_pfad, [], grund="ohne Browser nicht gemessen: Edge/Chrome nicht gefunden")
                raise SystemExit("Edge/Chrome nicht gefunden – oder mit --exe gegen das echte Programm prüfen.")
            profil = Path(tempfile.mkdtemp(prefix="labor-rauch-"))
            dport = freier_port()
            argumente = [str(edge), f"--remote-debugging-port={dport}", f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                         "--disable-extensions", "--window-size=1366,768", "about:blank"]
            if not sichtbar:
                argumente.insert(1, "--headless=new")
            browser = subprocess.Popen(argumente, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            s = Seite(seite_auf(dport), gegenprobe)
            url = f"http://127.0.0.1:{port}/index.html"
        s.neu_laden(url)
        gesamt, rot = 0, 0
        print(f"Rauchtest {'echtes Programm' if exe else 'web/index.html in Edge'} · erster Auftrag mit echter Maus + {len(FAELLE)} Ansichten, je {len(BREITEN)} Breiten"
              + (f"\nGEGENPROBE: {GEGENPROBE_CSS} – muss rot werden" if gegenprobe else ""))
        for b, h in BREITEN:
            s.groesse(b, h)
            gesamt += 1
            try:
                fehler, text = erster_auftrag(s)
            except RuntimeError as e:
                fehler, text = [f"JS: {e}"], ""
            rot += bool(fehler)
            print(f"{'✓' if not fehler else '✗'} {b:>4} px  {'Erster Auftrag (Maus)':<22} {text}{'  ← ' + ' · '.join(fehler) if fehler else ''}")
            s.neu_laden()                                  # Probe und Ergebnis des Einstiegs nicht in die nächsten Fälle mitnehmen
            for name, vorbereitung, haupt, sonder in FAELLE:
                gesamt += 1
                try:
                    fehler, akt = fall_pruefen(s, name, vorbereitung, haupt, sonder, b)
                except RuntimeError as e:
                    fehler, akt = [f"JS: {e}"], {}
                if fehler:
                    rot += 1
                text = ("„" + akt.get("text", "") + "“") if akt.get("text") else ""
                if akt.get("geraete"):
                    text += f" · {akt['geraete']} Geräte frei"
                print(f"{'✓' if not fehler else '✗'} {b:>4} px  {name:<22} {text}{'  ← ' + ' · '.join(fehler) if fehler else ''}")
            # R12-Vorprüfung (CSS-02): je Breite die sichtbaren Bedienelemente je Ansicht. Gemessen
            # wird mit dem Programm aus ethos.py, bewertet wird dort (r12_auswerten) — hier nur messen
            # und ablegen. Der Exit-Code bleibt unverändert: die verbindliche Zahl liefert ethos --dom
            # (VIS-05), das die harten Verträge klasse 6 / mitarbeit 3 durchsetzt.
            try:
                antwort = s.js(r12_js())
            except Exception as e:                                      # noqa: BLE001
                antwort = {"fehler": "JS: " + str(e)}
            zeile = r12_zeile(b, antwort)
            r12_messungen.append(zeile)
            if zeile["messbar"]:
                zahlen = [z for z in zeile["ansichten"] if z["zahl"] is not None]
                hoechste = max(zahlen, key=lambda z: z["zahl"])
                hart = [z for z in zahlen if z["name"] in ethos.R12_GRENZEN and z["zahl"] > ethos.R12_GRENZEN[z["name"]]]
                text = f"{len(zahlen)} Ansichten gemessen · höchste Zahl {hoechste['zahl']} ({hoechste['titel']})"
                if hart:
                    text += " · R12 VERSTOSS harter Vertrag: " + ", ".join(
                        f"{z['titel']} {z['zahl']} > {ethos.R12_GRENZEN[z['name']]}" for z in hart)
                else:
                    text += " · harte Verträge (klasse 6 / mitarbeit 3) eingehalten"
                print(f"  {'✗' if hart else '·'} R12 {b:>4} px  {text}")
            else:
                print(f"  ✗ R12 {b:>4} px  {zeile['grund']}")
        r12_daten = r12_json_schreiben(r12_pfad, r12_messungen)
        r12_geschrieben = True
        print(f"  R12-Vorprüfung {'gemessen' if r12_daten['gemessen'] else 'NICHT GEMESSEN'}"
              f" · {len(r12_daten['messungen'])} Breiten · {os.path.relpath(r12_pfad, HIER)}")
        js_fehler = [f for f in s.ws.fehler if "Tauri" not in f and "__TAURI" not in f]
        if js_fehler:
            rot += 1
            print("✗ JS-Fehler:", *js_fehler[:5], sep="\n  ")
        print(f"\n{gesamt - min(rot, gesamt)}/{gesamt} grün" + ("" if not rot else f" – {rot} rot"))
        # Onboarding-Tour 3.1.0: getrennter Fall (nicht in den 16x4 der Rauchpruefung enthalten).
        if not gegenprobe and not exe:
            try:
                onb_fehler, onb_text = onboarding_pruefen(s)
            except RuntimeError as e:
                onb_fehler, onb_text = ["JS: " + str(e)], ""
            print(f"{'OK ' if not onb_fehler else 'ROT'} Onboarding-Tour          {onb_text}"
                  + ("  <- " + " | ".join(onb_fehler) if onb_fehler else ""))
            if onb_fehler:
                rot += 1
        if gegenprobe:
            print("Gegenprobe: " + ("rot wie erwartet – der Rauchtest erkennt den Fehler" if rot else "GRÜN – der Rauchtest erkennt den Fehler NICHT"))
            return 0 if rot else 1
        return 1 if rot else 0
    finally:
        if not r12_geschrieben:
            try:
                r12_json_schreiben(r12_pfad, r12_messungen,
                                   grund="nicht gemessen: Lauf ohne vollständige R12-Messung beendet")
            except Exception:                                          # noqa: BLE001
                pass
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
