"use strict";
/* ---------- Werkstatt: Leiste, Palette-Suche, Vorlagen, Minimap (Architektur § 16.5) ----------
   Das Gerüst für den freien Modus. Es erweitert das vorhandene „Freie Labor“ (UI.sandbox in
   src/ui/start.js, store "sandbox", v:1) – kein zweiter Modus, keine neue Datenform, kein eigener
   Speicher. Alles hier ist reine Ansicht über UI.labor; die Zahlen kommen aus Spiel.werkstatt.

   Einhängepunkt (Vertrag § 16.5): UI.werkstatt.einrichten(laborEl, {sandbox}) hängt Leiste und
   Minimap in die Laboransicht. editor.js ruft es beim Aufbau der Ansicht auf und schaltet die
   Leiste über laden(..., {sandbox:true}) ein/aus – deshalb braucht die Verdrahtung in app.js
   KEINE Zeile. leiste() liefert das Element für den Integrator (z. B. für spiel.js).

   UI.werkstatt.suchen(frage)              unscharfe Gerätepalette-Suche (Algorithmus wie palette.js:69-77)
   UI.werkstatt.vorlagen()                 Spiel.werkstatt.vorlagen()
   UI.werkstatt.vorlageLaden(v)            Vorlage ins laufende Netz laden (EIN Verlaufsschritt)
   UI.werkstatt.minimapDaten(netz, ids)    reine Datenquelle: {geraete, kabel, auswahl, rahmen}
   UI.werkstatt.ZOOMSTUFEN                 [50, 75, 100, 150, 200]
   UI.werkstatt.einrichten(el, {sandbox})  Leiste + Minimap einhängen (idempotent)
   UI.werkstatt.sandboxModus(an)           Leiste nur im Sandbox-Kontext sichtbar
   UI.werkstatt.ansichtGeaendert()         Sichtrahmen/Zoom nachführen (ruft editor.js)
   UI.werkstatt.netzGeaendert()            Minimap und Kennwerte neu zeichnen (ruft editor.js)
   Minimap: reine Ansicht, keine Datenform, kein Speicher (§ 16.5). */
UI.werkstatt = (() => {
  const ZOOMSTUFEN = [50, 75, 100, 150, 200];
  const MINI_RAND = 80;
  let laborEl = null, leisteEl = null, miniEl = null, miniSvg = null, miniKabel = null, miniGeraete = null, miniRahmen = null;
  let suchFeld = null, suchListe = null, vorlagenKnopf = null, kennwertEl = null;
  let zoomFeld = null, stufeWahl = null;
  let sandbox = false, suchTreffer = [], suchIdx = 0, rahmenDaten = null, miniWelt = null, miniGross = false;

  const sym = (name, groesse) => (typeof UI.symbol === "function" ? UI.symbol(name, groesse) : null);

  /* ---------- Unscharfe Suche (Algorithmus wie src/ui/palette.js:69-77) ----------
     Alle Zeichen in Reihenfolge; Wortanfänge und zusammenhängende Treffer zählen mehr. Absichtlich
     dieselbe Formel: die Befehlspalette und die Gerätepalette sollen sich gleich anfühlen. */
  function punkte(text, frage){
    if (!frage) return 1;
    const t = String(text).toLowerCase(), f = String(frage).toLowerCase();
    const i = t.indexOf(f);
    if (i === 0) return 100;
    if (i > 0) return 80 - Math.min(30, i) + (/[\s:·-]/.test(t[i - 1]) ? 10 : 0);
    let pos = 0, p = 0, folge = 0;
    for (const c of f) { if (c === " ") continue; const j = t.indexOf(c, pos); if (j < 0) return 0; folge = j === pos ? folge + 1 : 0; p += 1 + folge; pos = j + 1; }
    return p;
  }
  function kategorieTitel(kat){ const k = (UI.KATEGORIEN || []).find(x => x.id === kat); return k ? k.titel : ""; }
  /* Filtert UI.GERAETE über Titel, Kurztext, Langtext, Typ und Kategorie. Leere Frage = alle (Reihenfolge des Fachs). */
  function suchen(frage){
    const f = String(frage == null ? "" : frage).trim();
    const alle = (UI.GERAETE || []).slice();
    if (!f) return alle;
    return alle.map(a => {
      const text = [a.titel, a.kurz, a.text, a.typ, a.skin || "", kategorieTitel(a.kategorie)].join(" ");
      const p = Math.max(punkte(a.titel, f) * 1.1, punkte(text, f) * .8, punkte(kategorieTitel(a.kategorie) + " " + a.titel, f) * .7);
      return {a, p};
    }).filter(x => x.p > 0).sort((x, y) => y.p - x.p || String(x.a.titel).localeCompare(String(y.a.titel), "de")).map(x => x.a);
  }

  /* ---------- Leiste ---------- */
  function leiste(){
    if (leisteEl) return leisteEl;
    suchFeld = h("input", {type: "search", class: "wk-suche-feld", placeholder: "Gerät suchen …", "aria-label": "Gerätepalette durchsuchen",
      autocomplete: "off", spellcheck: "false", role: "combobox", "aria-expanded": "false", "aria-controls": "wk-treffer",
      oninput: () => suchenZeichnen(), onfocus: () => { if (suchFeld.value.trim()) suchenZeichnen(); }, onkeydown: e => suchTaste(e)});
    suchListe = h("div", {class: "wk-treffer", id: "wk-treffer", role: "listbox", "aria-label": "Gefundene Geräte", hidden: true});
    vorlagenKnopf = h("button", {type: "button", class: "wk-knopf", "aria-haspopup": "menu", title: "Vorlage laden – ersetzt das Netz; Rückgängig bringt es zurück",
      onclick: e => vorlagenMenue(e.currentTarget)}, sym("mappe", 16), h("span", {}, "Vorlagen"));
    kennwertEl = h("span", {class: "wk-kennwerte", "aria-live": "polite"});
    leisteEl = h("div", {class: "wk-leiste", role: "toolbar", "aria-label": "Werkstatt"},
      h("span", {class: "wk-titel", "aria-hidden": "true"}, "Werkstatt"),
      h("label", {class: "wk-suche"}, sym("suche", 16), suchFeld),
      vorlagenKnopf,
      h("span", {class: "wk-luecke"}),
      kennwertEl,
      suchListe);
    return leisteEl;
  }
  function suchenZeichnen(){
    const f = String(suchFeld.value || "").trim();
    suchTreffer = suchen(f).slice(0, 8);
    suchIdx = 0;
    suchListe.replaceChildren(...(suchTreffer.length
      ? suchTreffer.map((a, i) => h("button", {type: "button", role: "option", class: "wk-punkt", "data-i": i, "aria-selected": "false",
          onpointerdown: e => { e.preventDefault(); einsetzen(a); },
          onpointermove: () => { if (suchIdx !== i) { suchIdx = i; suchMarkieren(); } }},
          sv("svg", {viewBox: "-34 -30 68 60", width: 26, height: 23, "aria-hidden": "true"}, UI.geraetebild(a.typ, a.skin)),
          h("span", {class: "wk-punkt-text"}, h("b", {}, a.titel), h("small", {}, a.kurz))))
      : [h("div", {class: "wk-nichts"}, "Nichts gefunden – Suchwort kürzen oder im Fach die Kategorie wählen.")]));
    suchListe.hidden = !f;
    suchFeld.setAttribute("aria-expanded", String(!!f));
    suchMarkieren();
  }
  function suchMarkieren(){
    if (!suchListe) return;
    let k = 0;
    for (const el of suchListe.children) {
      if (!el.classList || !el.classList.contains("wk-punkt")) continue;
      const an = k === suchIdx;
      el.classList.toggle("an", an);
      el.setAttribute("aria-selected", String(an));
      k++;
    }
    const aktiv = suchListe.querySelector(`[data-i="${suchIdx}"]`);
    if (aktiv && aktiv.scrollIntoView) aktiv.scrollIntoView({block: "nearest"});
  }
  function suchTaste(e){
    const n = suchTreffer.length;
    if (e.key === "ArrowDown") { e.preventDefault(); if (n) { suchIdx = (suchIdx + 1) % n; suchMarkieren(); } return; }
    if (e.key === "ArrowUp") { e.preventDefault(); if (n) { suchIdx = (suchIdx + n - 1) % n; suchMarkieren(); } return; }
    if (e.key === "Enter") { e.preventDefault(); const a = suchTreffer[suchIdx]; if (a) einsetzen(a); return; }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); sucheSchliessen(); return; }
  }
  function sucheSchliessen(){
    if (!suchListe) return;
    suchListe.hidden = true;
    if (suchFeld) suchFeld.setAttribute("aria-expanded", "false");
  }
  function einsetzen(a){
    if (!a) return;
    sucheSchliessen();
    if (suchFeld) suchFeld.value = "";
    try { UI.labor.einsetzen(a.typ, a.skin || null); } catch (e) { console.error("Einsetzen", e); }
    if (suchFeld && suchFeld.focus) suchFeld.focus({preventScroll: true});      /* mehrere Geräte hintereinander */
  }

  /* ---------- Vorlagen ---------- */
  function vorlagen(){ return Spiel.werkstatt ? Spiel.werkstatt.vorlagen() : []; }
  function vorlagenMenue(knopf){
    const liste = vorlagen();
    if (typeof UI.menue !== "function") return;
    const r = knopf.getBoundingClientRect();
    UI.menue(r.left, r.bottom + 6, liste.map(v => ({text: v.titel, info: v.kurz, titel: v.text, fn: () => vorlageLaden(v)})), {titel: "Vorlage laden"});
  }
  /* Vorlage ins laufende Netz: EIN Verlaufsschritt, dieselbe Netzform, derselbe Objektbezug – so
     speichert UI.sandbox (start.js) über „netz-geaendert" weiter, und Rückgängig holt das alte Netz. */
  function vorlageLaden(v){
    const labor = UI.labor;
    if (!labor || !labor.netz || !labor.verlauf || !v || typeof v.bauen !== "function") return null;
    let frisch;
    try { frisch = v.bauen(); } catch (e) { console.error("Vorlage bauen", e); return null; }
    if (!Spiel.werkstatt || !Spiel.werkstatt.netzGueltig(frisch)) { UI.toast?.("Diese Vorlage ist unvollständig und wurde nicht geladen.", "fehler"); return null; }
    try {
      labor.verlauf.aendern(`Vorlage „${v.titel}“ geladen`, n => {
        for (const k of Object.keys(n)) delete n[k];
        Object.assign(n, tief(frisch));
      });
    } catch (e) { console.error("Vorlage laden", e); return null; }
    try { labor.einpassen(true); } catch (e) { console.error(e); }
    UI.toast?.(`Vorlage „${v.titel}“ geladen – Rückgängig bringt dein voriges Netz zurück.`, "ok",
      {id: "vorlage", aktion: {text: "Rückgängig", fn: () => UI.labor.rueckgaengig()}});
    return frisch;
  }

  /* ---------- Minimap: reine Datenquelle (kein DOM, prüfbar) ---------- */
  function minimapDaten(netz, ids){
    const auswahl = new Set(Array.isArray(ids) ? ids : []);
    const liste = netz && netz.geraete && typeof netz.geraete === "object" ? Object.values(netz.geraete) : [];
    const geraete = liste.filter(g => g && g.id).map(g => ({id: g.id, typ: g.typ, x: Number(g.x) || 0, y: Number(g.y) || 0, gewaehlt: auswahl.has(g.id)}));
    const nach = new Map(geraete.map(g => [g.id, g]));
    const kabel = [];
    for (const k of Array.isArray(netz && netz.kabel) ? netz.kabel : []) {
      const a = k && k.a ? nach.get(k.a.geraet) : null, b = k && k.b ? nach.get(k.b.geraet) : null;
      if (a && b) kabel.push({id: k.id, a: {x: a.x, y: a.y}, b: {x: b.x, y: b.y}});
    }
    if (!geraete.length) return {geraete, kabel, auswahl: [...auswahl], rahmen: null};
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const g of geraete) { x1 = Math.min(x1, g.x); y1 = Math.min(y1, g.y); x2 = Math.max(x2, g.x); y2 = Math.max(y2, g.y); }
    x1 -= MINI_RAND; y1 -= MINI_RAND; x2 += MINI_RAND; y2 += MINI_RAND;
    const minB = 380, minH = 280;
    if (x2 - x1 < minB) { const m = (x1 + x2) / 2; x1 = m - minB / 2; x2 = m + minB / 2; }
    if (y2 - y1 < minH) { const m = (y1 + y2) / 2; y1 = m - minH / 2; y2 = m + minH / 2; }
    return {geraete, kabel, auswahl: [...auswahl], rahmen: {x1, y1, x2, y2}};
  }

  /* ---------- Minimap: Zeichnung ---------- */
  function minimap(){
    if (miniEl) return miniEl;
    miniKabel = sv("g", {class: "wk-mini-kabel"});
    miniGeraete = sv("g", {class: "wk-mini-geraete"});
    miniRahmen = sv("rect", {class: "wk-mini-rahmen", x: 0, y: 0, width: 0, height: 0, visibility: "hidden"});
    miniSvg = sv("svg", {class: "wk-mini-svg", viewBox: "0 0 100 100", preserveAspectRatio: "xMidYMid meet", role: "img",
      "aria-label": "Übersicht des Netzes – Klick zentriert die Fläche"}, miniKabel, miniGeraete, miniRahmen);
    miniSvg.addEventListener("pointerdown", klick);
    zoomFeld = h("input", {type: "text", inputmode: "numeric", class: "wk-zoomfeld", "aria-label": "Zoom in Prozent", value: "100 %", title: "Zoom eingeben (50–300 %), Enter übernimmt",
      onchange: () => zoomEingabe(), onkeydown: e => { if (e.key === "Enter") { e.preventDefault(); zoomEingabe(); } }});
    stufeWahl = h("select", {class: "wk-stufe", "aria-label": "Zoomstufe", title: "Zoomstufe wählen",
      onchange: e => { const p = +e.target.value; if (p) zoomProzent(p); }},
      ZOOMSTUFEN.map(p => h("option", {value: String(p)}, p + " %")));
    stufeWahl.value = "100";
    const fit = h("button", {type: "button", class: "wk-mini-knopf", title: "Auf Auswahl einpassen (⇧F)", "aria-label": "Auf Auswahl einpassen",
      onclick: () => { if (UI.labor.einpassenAuswahl) UI.labor.einpassenAuswahl(); else UI.labor.einpassen(); }}, sym("einpassen", 14));
    miniEl = h("div", {class: "wk-mini", role: "group", "aria-label": "Minimap"},
      h("div", {class: "wk-mini-kopf"}, h("span", {class: "wk-mini-titel"}, "Übersicht"), fit),
      miniSvg,
      h("div", {class: "wk-mini-fuss"}, h("label", {class: "wk-mini-zoom"}, h("span", {class: "wk-mini-zoomtext"}, "Zoom"), zoomFeld), stufeWahl));
    return miniEl;
  }
  function zoomEingabe(){
    if (!zoomFeld) return;
    const roh = String(zoomFeld.value || "").replace(/[^\d.,-]/g, "").replace(",", ".");
    const p = Number(roh);
    if (Number.isFinite(p) && p > 0) zoomProzent(p);
    else if (zoomFeld) zoomFeld.value = Math.round(UI.labor.zoomProzent ? UI.labor.zoomProzent() : 100) + " %";
  }
  function zoomProzent(p){
    const k = Math.max(50, Math.min(300, Math.round(p)));
    if (UI.labor.zoomAufProzent) UI.labor.zoomAufProzent(k);
    if (zoomFeld) zoomFeld.value = k + " %";
    if (stufeWahl) stufeWahl.value = String(k);
  }
  function klick(e){
    if (!rahmenDaten || !miniSvg || !UI.labor.mitteAufWelt) return;
    const r = miniSvg.getBoundingClientRect();
    if (!r || !r.width || !r.height) return;
    const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    if (e.preventDefault) e.preventDefault();
    UI.labor.mitteAufWelt(rahmenDaten.x1 + fx * (rahmenDaten.x2 - rahmenDaten.x1), rahmenDaten.y1 + fy * (rahmenDaten.y2 - rahmenDaten.y1));
  }
  /* Sichtbarer Weltausschnitt des Labors (nur wenn die Ansicht messbar ist). */
  function sichtbereichMini(){
    try { return UI.labor && UI.labor.sichtbereich ? UI.labor.sichtbereich() : null; } catch (e) { return null; }
  }
  function rahmenVereinigen(a, b){
    if (!a) return b || null;
    if (!b) return a;
    return {x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1), x2: Math.max(a.x2, b.x2), y2: Math.max(a.y2, b.y2)};
  }
  function minimapAktualisieren(){
    if (!miniEl || !miniSvg) return false;
    const netz = UI.labor ? UI.labor.netz : null;
    const ids = UI.labor && UI.labor.auswahlMehr ? UI.labor.auswahlMehr() : [];
    const d = minimapDaten(netz, ids);
    if (!d.rahmen) {
      rahmenDaten = null; miniWelt = null; miniGross = false;
      miniSvg.setAttribute("viewBox", "0 0 100 100");
      miniKabel.replaceChildren(); miniGeraete.replaceChildren();
      miniRahmen.setAttribute("visibility", "hidden");
      kennwerteZeigen();
      return true;
    }
    /* Sichtrahmen mit einbeziehen (Befund B10): Zeigt die Ansicht alles, ist der sichtbare Ausschnitt
       größer als der Geräte-Rahmen. Dann bleibt der Geräte-Rahmen der Maßstab (sonst schrumpfte das
       Netz in eine Ecke) und der Sichtrahmen läuft als gestrichelte Kante am Minimap-Rand – statt
       „hidden" zu sein. Nur wenn die Ansicht weiter hinausgeht als das Netz, wächst der Ausschnitt mit. */
    const sicht = sichtbereichMini();
    miniWelt = d.rahmen;
    const enthaelt = sicht && d.rahmen && sicht.x1 <= d.rahmen.x1 && sicht.y1 <= d.rahmen.y1 && sicht.x2 >= d.rahmen.x2 && sicht.y2 >= d.rahmen.y2;
    miniGross = !!enthaelt;
    const b = enthaelt ? d.rahmen : (rahmenVereinigen(d.rahmen, sicht) || d.rahmen);
    const pad = Math.max(6, Math.hypot(b.x2 - b.x1, b.y2 - b.y1) * 0.04);
    const vb = {x1: b.x1 - pad, y1: b.y1 - pad, x2: b.x2 + pad, y2: b.y2 + pad};
    rahmenDaten = vb;
    miniSvg.setAttribute("viewBox", vb.x1 + " " + vb.y1 + " " + (vb.x2 - vb.x1) + " " + (vb.y2 - vb.y1));
    /* Punktgröße in Bildschirm-Pixeln statt Welt-Einheiten: 2,2 px, gewählt 3,2 px (Vertrag § 3.5).
       Dafür den Maßstab aus der Anzeigebreite der Minimap schätzen; ohne plausible Messung (DOM-Ersatz
       der Tests: 900x600) gilt die Breite aus werkstatt.css. */
    let pixelBreite = 182;
    try { const r = miniSvg.getBoundingClientRect(); if (r && r.width > 20 && r.width < 400) pixelBreite = r.width; } catch (e) { /* dann 182 */ }
    const skala = (vb.x2 - vb.x1) / pixelBreite;
    const rNormal = Math.max(2.2, 2.2 * skala), rWahl = Math.max(3.2, 3.2 * skala);
    miniKabel.replaceChildren(...d.kabel.map(k => sv("line", {class: "wk-mini-kabel-linie", x1: k.a.x, y1: k.a.y, x2: k.b.x, y2: k.b.y})));
    miniGeraete.replaceChildren(...d.geraete.map(g => sv("circle", {class: "wk-mini-punkt typ-" + g.typ + (g.gewaehlt ? " an" : ""), cx: g.x, cy: g.y, r: g.gewaehlt ? rWahl : rNormal})));
    miniRahmen.setAttribute("visibility", "visible");
    sichtrahmenZeichnen();
    kennwerteZeigen();
    return true;
  }
  /* Sichtrahmen: welcher Weltausschnitt ist gerade auf der Fläche zu sehen? (UI.labor.sichtbereich) */
  function sichtrahmenZeichnen(){
    if (!miniRahmen || !miniSvg) return;
    const s = sichtbereichMini();
    if (!s || !rahmenDaten) { miniRahmen.setAttribute("visibility", "hidden"); return; }
    /* Auf den Minimap-Ausschnitt begrenzen: Zeigt die Ansicht alles, ist der Sichtrahmen der Rand der
       Minimap selbst (dann bleibt der Strich vollständig sichtbar statt halb abgeschnitten zu werden). */
    const x1 = Math.max(s.x1, rahmenDaten.x1), y1 = Math.max(s.y1, rahmenDaten.y1);
    const x2 = Math.min(s.x2, rahmenDaten.x2), y2 = Math.min(s.y2, rahmenDaten.y2);
    if (x2 <= x1 || y2 <= y1) { miniRahmen.setAttribute("visibility", "hidden"); return; }
    miniRahmen.setAttribute("x", String(x1));
    miniRahmen.setAttribute("y", String(y1));
    miniRahmen.setAttribute("width", String(x2 - x1));
    miniRahmen.setAttribute("height", String(y2 - y1));
    miniRahmen.setAttribute("visibility", "visible");
  }
  function zahlenText(kw){
    const g = kw.geraete + " " + (kw.geraete === 1 ? "Gerät" : "Geräte");
    const k = kw.kabel + " " + (kw.kabel === 1 ? "Kabel" : "Kabel");
    return kw.vlans ? g + " · " + k + " · " + kw.vlans + " VLANs" : g + " · " + k;
  }
  function kennwerteZeigen(){
    if (!kennwertEl) return;
    try {
      const netz = UI.labor ? UI.labor.netz : null;
      kennwertEl.textContent = netz && Spiel.werkstatt ? zahlenText(Spiel.werkstatt.kennwerte(netz)) : "";
    } catch (e) { kennwertEl.textContent = ""; }
  }

  /* ---------- Einhängen (der eine Integrationspunkt) ---------- */
  function einrichten(el, opt = {}){
    if (!el || el.nodeType !== 1) return false;
    laborEl = el;
    if (typeof opt.sandbox === "boolean") sandboxModus(opt.sandbox);
    const mitte = el.querySelector(".lb-mitte");
    if (mitte && (!leisteEl || leisteEl.parentNode !== mitte)) {
      leiste().hidden = !sandbox;
      mitte.prepend(leiste());
    } else if (leisteEl) leisteEl.hidden = !sandbox;
    const leinwand = el.querySelector(".lb-leinwand");
    if (leinwand && !miniEl) leinwand.append(minimap());
    minimapAktualisieren();
    return !!(leisteEl && miniEl);
  }
  function sandboxModus(an){
    sandbox = !!an;
    if (leisteEl) leisteEl.hidden = !sandbox;
    if (!sandbox) sucheSchliessen();
    return sandbox;
  }

  /* ---------- Haken von editor.js ---------- */
  function ansichtGeaendert(){
    if (!miniEl || !miniEl.isConnected) return;
    const p = UI.labor && UI.labor.zoomProzent ? Math.round(UI.labor.zoomProzent()) : 100;
    if (zoomFeld && document.activeElement !== zoomFeld) zoomFeld.value = p + " %";
    if (stufeWahl) stufeWahl.value = String(p);
    /* Wächst der sichtbare Ausschnitt über den Minimap-Rahmen hinaus, muss der Ausschnitt nachziehen;
       zoomt man wieder hinein, kehrt die Minimap zum Geräte-Rahmen zurück (sonst bliebe sie klein).
       Sonst nur den Sichtrahmen verschieben – kein Flackern bei jedem Rädchen. */
    const s = sichtbereichMini();
    const gross = s && miniWelt && s.x1 <= miniWelt.x1 && s.y1 <= miniWelt.y1 && s.x2 >= miniWelt.x2 && s.y2 >= miniWelt.y2;
    const raus = s && rahmenDaten && (s.x1 < rahmenDaten.x1 + 1 || s.y1 < rahmenDaten.y1 + 1 || s.x2 > rahmenDaten.x2 - 1 || s.y2 > rahmenDaten.y2 - 1);
    if (!!gross !== miniGross || (!gross && raus)) minimapAktualisieren(); else sichtrahmenZeichnen();
  }
  function netzGeaendert(){ minimapAktualisieren(); }
  function auswahlGeaendert(){ minimapAktualisieren(); }

  /* ---------- Der echte Weg, ohne app.js/start.js anzufassen ----------
     start.js lädt die Sandbox mit UI.labor.laden(netz, {…, sandbox:true}); editor.js meldet
     „labor-geladen" und die Ansicht meldet „ansicht". Die Leiste hängt genau dann, wenn das
     geladene Netz das Sandbox-Netz ist (UI.sandbox.netz, Getter in start.js:41). Damit ist die
     Werkstatt auch nach einem Neuaufbau der Ansicht erreichbar; editor.js ruft einrichten()
     zusätzlich direkt beim Aufbau auf (beide Wege sind idempotent). */
  function sandboxAktiv(d){
    try {
      const s = UI.sandbox;
      if (!s || typeof s !== "object") return false;
      const netz = d && d.netz ? d.netz : (UI.labor ? UI.labor.netz : null);
      return !!netz && s.netz === netz;
    } catch (e) { return false; }
  }
  function einhaengen(){
    const el = typeof document !== "undefined" && document.querySelector ? document.querySelector(".labor") : null;
    if (!el) return false;
    return einrichten(el, {sandbox: sandboxAktiv()});
  }
  /* Die Minimap hängt am DOM der Ansicht; ohne Ansicht wird nichts gezeichnet. */
  Bus.an("netz-geaendert", () => { if (miniEl && miniEl.isConnected) minimapAktualisieren(); });
  Bus.an("auswahl", () => { if (miniEl && miniEl.isConnected) minimapAktualisieren(); });
  Bus.an("labor-geladen", d => { if (miniEl && miniEl.isConnected) minimapAktualisieren(); einhaengen(); });
  Bus.an("ansicht", name => { if (name === "labor") einhaengen(); });
  Bus.an("ui-bereit", () => einhaengen());

  return {ZOOMSTUFEN, suchen, leiste, einrichten, sandboxModus, vorlagen, vorlageLaden,
          minimapDaten, minimapAktualisieren, ansichtGeaendert, netzGeaendert, auswahlGeaendert,
          get mini(){ return miniEl; }, get sandbox(){ return sandbox; }};
})();
