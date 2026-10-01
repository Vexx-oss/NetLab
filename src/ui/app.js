"use strict";
/* ---------- App-Rahmen: Kopfzeile, Andock-Leiste, Ansichten, Einstellungen, Modi (Architektur § 9) ----------
   UI.app.registrieren(name, {titel, symbol, zeigen(container), wieder?(container), verlassen?(), zaehler?()})
   UI.app.ansicht(name)                  Ansicht wechseln (jede Ansicht füllt die Fläche; kein Fenstersystem)
   UI.app.status({euro, ruf, stufe, offen, fortschritt?:{anteil, text, bereit}})   Werte der Kopfzeile (leuchten bei Änderung kurz auf, Zahlen zählen hoch)
   UI.app.einstellungen()                Dialog; UI.app.einstellungAbschnitt(titel, renderFn(container)) ergänzt Abschnitte
   UI.app.hilfe()                        Tastenkürzel      UI.app.aktualisieren()  Zähler der Andock-Leiste neu lesen
   UI.app.liste()                        [{name, titel, symbol}]   UI.app.aktuell  Name der aktiven Ansicht
   UI.modus("voll"|"leiste"|"tray")      Wechsel im selben Fenster; baut das DOM der Vollansicht ab (store.sofort() vorher)
   UI.bewegung()                         "voll"|"reduziert"|"aus" (Einstellung + prefers-reduced-motion)
   Spiel-Ansichten melden sich an, indem sie beim Laden (UI.startHaken ||= []).push(() => UI.app.registrieren(…)) eintragen,
   oder später jederzeit UI.app.registrieren(…) aufrufen. */
UI.bewegung = function(){
  const e = (typeof store !== "undefined" && store.get("einst", {})) || {};
  if (e.bewegung === "aus") return "aus";
  if (e.bewegung === "reduziert" || wenigBewegung()) return "reduziert";
  return "voll";
};

UI.app = (() => {
  const REIHE = ["postfach", "labor", "kunden", "wiki", "lernstand", "shop"];
  const PLATZ = {
    postfach:  {titel: "Postfach",  symbol: "postfach",  text: "Hier landen die Aufträge deiner Kunden: Störungen, Projekte, Wartung.", mehr: "Das Postfach öffnet, sobald die Karriere eingebaut ist."},
    kunden:    {titel: "Kunden",    symbol: "kunden",    text: "Deine Kunden mit Vertrag, Ampel und Bewertungen.", mehr: "Die Kundenliste kommt mit der Karriere."},
    wiki:      {titel: "Wiki",      symbol: "wiki",      text: "Nachschlagen: Subnetting, VLAN, NAT, ACL, DHCP, DNS …", mehr: "Das Wiki wird gerade eingerichtet."},
    lernstand: {titel: "Lernstand", symbol: "lernstand", text: "Was du schon sicher kannst und was als Nächstes dran ist.", mehr: "Der Lernstand kommt mit dem Lernmotor."},
    shop:      {titel: "Shop",      symbol: "shop",      text: "Werkzeuge, Geräte und Verträge für dein Systemhaus.", mehr: "Der Shop öffnet mit der Karriere."},
  };
  const ansichten = new Map();
  const abschnitte = [];
  let root = null, el = {}, aktiv = null, gebaut = new Map(), wert = {euro: null, ruf: null, stufe: null, offen: null}, dialog = null;
  let modus = null, tastenAn = false;

  /* ---------- Thema ---------- */
  const einst = () => store.get("einst", {}) || {};
  function einstSetzen(teil){ const e = einst(); Object.assign(e, teil); store.set("einst", e); }
  function themaAnwenden(){
    const t = einst().thema, d = document.documentElement;
    if (t === "hell") d.dataset.theme = "light"; else if (t === "dunkel") d.dataset.theme = "dark"; else delete d.dataset.theme;
    d.dataset.bewegung = UI.bewegung();
    if (el.thema) { const dunkel = istDunkel(); el.thema.replaceChildren(UI.symbol(dunkel ? "sonne" : "mond", 18)); el.thema.title = dunkel ? "Helle Darstellung" : "Dunkle Darstellung"; }
  }
  function istDunkel(){
    const t = document.documentElement.dataset.theme;
    if (t) return t === "dark";
    return !(typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches);
  }
  function themaUmschalten(){ einstSetzen({thema: istDunkel() ? "hell" : "dunkel"}); themaAnwenden(); }

  /* ---------- Ansichten ---------- */
  function registrieren(name, def){
    if (!name || !def) return;
    const alt = ansichten.get(name);
    ansichten.set(name, Object.assign({name, titel: name, symbol: "info"}, def));
    if (alt && gebaut.has(name)) { gebaut.get(name).remove(); gebaut.delete(name); if (aktiv === name) { aktiv = null; ansicht(name); } }
    dockZeichnen();
  }
  function platzhalterDef(name){
    const p = PLATZ[name];
    return {titel: p.titel, symbol: p.symbol, platzhalter: true, zeigen: c => {
      c.append(h("div", {class: "platzhalter"},
        h("div", {class: "ph-sym"}, UI.symbol(p.symbol, 40)),
        h("h2", {}, p.titel),
        h("p", {class: "ph-text"}, p.text),
        h("p", {class: "ph-mehr"}, p.mehr + " Bis dahin: probier im freien Labor alles aus – nichts kann kaputtgehen, Rückgängig macht alles wieder gut."),
        h("button", {type: "button", class: "knopf knopf-haupt", onclick: () => ansicht("labor")}, UI.symbol("labor", 18), "Zum Labor")));
    }};
  }
  function grundAusstattung(){
    if (!ansichten.has("labor")) ansichten.set("labor", {name: "labor", titel: "Labor", symbol: "labor", zeigen: c => UI.labor.zeigen(c), wieder: () => UI.labor.wieder()});
    for (const n of Object.keys(PLATZ)) if (!ansichten.has(n)) ansichten.set(n, Object.assign({name: n}, platzhalterDef(n)));
  }
  function liste(){
    const namen = [...REIHE.filter(n => ansichten.has(n)), ...[...ansichten.keys()].filter(n => !REIHE.includes(n))];
    return namen.map(n => { const a = ansichten.get(n); return {name: n, titel: a.titel, symbol: a.symbol, platzhalter: !!a.platzhalter}; });
  }
  function ansicht(name){
    if (!ansichten.has(name)) return;
    if (modus !== "voll" || !root) { aktiv = name; return; }
    if (aktiv === name && gebaut.has(name)) return;
    const vorher = aktiv && ansichten.get(aktiv);
    try { vorher?.verlassen?.(); } catch (e) { console.error(e); }
    UI.menue?.zu?.();
    aktiv = name;
    for (const [n, c] of gebaut) c.hidden = n !== name;
    const def = ansichten.get(name);
    let c = gebaut.get(name);
    if (!c) {
      c = h("div", {class: "ansicht", "data-ansicht": name});
      el.flaeche.append(c); gebaut.set(name, c);
      try { def.zeigen(c); } catch (e) { console.error("Ansicht " + name, e); c.append(h("p", {class: "platzhalter"}, `Diese Ansicht konnte nicht aufgebaut werden: ${e.message || e}`)); }
    } else { c.hidden = false; try { def.wieder?.(c); } catch (e) { console.error(e); } }
    for (const b of $$(".dock-knopf", root)) { const an = b.dataset.ansicht === name; b.classList.toggle("an", an); if (an) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
    Bus.senden("ansicht", name);
  }
  function dockZeichnen(){
    if (!el.dock) return;
    el.dock.replaceChildren(...liste().map(a => {
      const z = h("span", {class: "dock-zahl", hidden: true});
      const b = h("button", {type: "button", class: "dock-knopf" + (a.name === aktiv ? " an" : "") + (a.platzhalter ? " spaeter" : ""), "data-ansicht": a.name, title: a.titel,
        onclick: () => ansicht(a.name)}, typeof a.symbol === "string" ? UI.symbol(a.symbol, 22) : a.symbol, h("span", {class: "dock-text"}, a.titel), z);
      if (a.name === aktiv) b.setAttribute("aria-current", "page");
      return b;
    }));
    aktualisieren();
  }
  function aktualisieren(){
    if (!el.dock) return;
    for (const b of $$(".dock-knopf", el.dock)) {
      const def = ansichten.get(b.dataset.ansicht), z = $(".dock-zahl", b);
      let n = 0; try { n = def?.zaehler ? +def.zaehler() || 0 : 0; } catch (e) { console.error(e); }
      z.hidden = !n; z.textContent = n > 99 ? "99+" : String(n);
    }
  }

  /* ---------- Kopfzeile ---------- */
  function wertEl(klasse, sym, titel, onclick){
    const zahl = h("span", {class: "wert-zahl"});
    const b = h(onclick ? "button" : "div", {class: "wert " + klasse, title: titel, ...(onclick ? {type: "button", onclick} : {})}, UI.symbol(sym, 16), zahl);
    return {b, zahl};
  }
  const FORMAT = {
    euro: x => x == null ? "– €" : `${eur(x)} €`,
    ruf: x => x == null ? "Ruf –" : `Ruf ${zahlDe(Math.round(x))}`,
    stufe: x => x == null ? "Stufe –" : `Stufe ${x}`,
    offen: x => x == null ? "0 offen" : `${zahlDe(x)} offen`,
  };
  function status(s = {}){
    /* Fortschritt zur nächsten Stufe als feiner Balken unter „Stufe N“ (Ruf UND Können zählen, der kleinere Anteil bestimmt) */
    if ("fortschritt" in s && el.werte?.stufe) {
      const f = s.fortschritt, b = el.werte.stufe.b;
      b.classList.toggle("mit-fortschritt", !!f);
      b.classList.toggle("bereit", !!f?.bereit);
      b.style.setProperty("--fortschritt", f ? Math.round(klemme(f.anteil || 0, 0, 1) * 100) + "%" : "0%");
      b.title = f?.text || "Karriere-Stufe";
    }
    for (const k of Object.keys(FORMAT)) {
      if (!(k in s)) continue;
      const alt = wert[k], neu = s[k];
      wert[k] = neu;
      const w = el.werte?.[k]; if (!w) continue;
      if (alt === neu) { w.zahl.textContent = FORMAT[k](neu); continue; }
      w.b.classList.toggle("leer", neu == null);
      if (k === "offen") w.b.classList.toggle("hat", +neu > 0);
      if (typeof alt === "number" && typeof neu === "number" && k !== "stufe" && UI.bewegung() === "voll") zaehlen(w, k, alt, neu);
      else w.zahl.textContent = FORMAT[k](neu);
      if (alt != null && neu != null) { w.b.classList.remove("leuchtet"); void w.b.offsetWidth; w.b.classList.add("leuchtet"); w.b.classList.toggle("runter", neu < alt); }
    }
  }
  function zaehlen(w, k, alt, neu){
    const t0 = performance.now(), ms = 700, marke = (w.marke = (w.marke || 0) + 1);
    const s = t => {
      if (w.marke !== marke) return;
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      const x = alt + (neu - alt) * e;
      w.zahl.textContent = FORMAT[k](k === "euro" ? x : Math.round(x));
      if (p < 1) requestAnimationFrame(s); else w.zahl.textContent = FORMAT[k](neu);
    };
    requestAnimationFrame(s);
  }

  /* ---------- Aufbau der Vollansicht ---------- */
  function aufbauen(container){
    grundAusstattung();
    root = h("div", {class: "app"});
    const knopf = (sym, titel, fn, text) => h("button", {type: "button", class: "kopf-knopf" + (text ? " mit-text" : ""), title: titel, "aria-label": titel, onclick: fn}, UI.symbol(sym, 18), text ? h("span", {}, text) : null);
    el.werte = {
      euro: wertEl("wert-euro", "euro", "Kontostand deines Systemhauses"),
      ruf: wertEl("wert-ruf", "stern", "Ruf bei deinen Kunden"),
      stufe: wertEl("wert-stufe", "stufe", "Karriere-Stufe", () => ansicht("lernstand")),
      offen: wertEl("wert-offen", "postfach", "Offene Tickets im Postfach", () => ansicht("postfach")),
    };
    el.thema = knopf("sonne", "Hell/Dunkel", themaUmschalten);
    const kopf = h("header", {class: "kopf"},
      h("div", {class: "kopf-marke"},
        sv("svg", {viewBox: "0 0 32 32", width: 28, height: 28, class: "marke-sym", "aria-hidden": "true"},
          sv("rect", {x: 1.5, y: 1.5, width: 29, height: 29, rx: 8}),
          sv("path", {d: "M9 21V11h5v5h5v-5h4"}), sv("circle", {cx: 9, cy: 21, r: 2.2}), sv("circle", {cx: 23, cy: 11, r: 2.2}), sv("circle", {cx: 19, cy: 21, r: 2.2}), sv("path", {d: "M19 16v5"})),
        h("span", {class: "marke-name"}, "Netzwerk-Labor"),
        h("span", {class: "marke-version", title: typeof LABOR_BAU !== "undefined" ? "Gebaut " + LABOR_BAU : ""}, "v" + (typeof LABOR_VERSION !== "undefined" ? LABOR_VERSION : "dev"))),
      h("div", {class: "kopf-werte"}, el.werte.euro.b, el.werte.ruf.b, el.werte.stufe.b, el.werte.offen.b),
      h("div", {class: "kopf-knoepfe"},
        knopf("suche", "Befehlspalette (Strg+K)", () => UI.palette.oeffnen(), "Strg+K"),
        knopf("leiste", "Zur Leiste wechseln (kompakte Ansicht am Rand)", () => UI.modus("leiste"), "Leiste"),
        el.thema,
        knopf("zahnrad", "Einstellungen", () => einstellungen()),
        knopf("hilfe", "Tastenkürzel (?)", () => hilfe())));
    el.dock = h("nav", {class: "dock", "aria-label": "Ansichten"});
    el.flaeche = h("main", {class: "flaeche"});
    root.append(kopf, el.dock, el.flaeche);
    container.replaceChildren(root);
    gebaut = new Map();
    const alt = {...wert}; for (const k of Object.keys(wert)) wert[k] = undefined;
    status(alt);
    themaAnwenden();
    dockZeichnen();
    const ziel = aktiv && ansichten.has(aktiv) ? aktiv : "labor";
    aktiv = null;
    ansicht(ziel);
    tastenEinrichten();
  }
  function abbauen(){
    dialogZu();
    for (const [n] of gebaut) { try { ansichten.get(n)?.verlassen?.(); } catch (e) { console.error(e); } }
    gebaut = new Map();
    root?.remove(); root = null; el = {};
  }

  /* ---------- Dialoge: Einstellungen und Tastenkürzel ---------- */
  function dialogOeffnen(titel, inhalt, klasse = ""){
    dialogZu();
    const zu = h("button", {type: "button", class: "dialog-zu", title: "Schließen (Esc)", "aria-label": "Schließen", onclick: () => dialogZu()}, UI.symbol("schliessen", 18));
    const kasten = h("div", {class: "dialog " + klasse, role: "dialog", "aria-modal": "true", "aria-label": titel},
      h("div", {class: "dialog-kopf"}, h("h2", {}, titel), zu), h("div", {class: "dialog-inhalt"}, inhalt));
    const huelle = h("div", {class: "dialog-huelle", onpointerdown: e => { if (e.target === huelle) dialogZu(); }}, kasten);
    huelle.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); dialogZu(); }
      if (e.key === "Tab") {         /* Fokus im Dialog halten */
        const f = $$("button:not([disabled]), input:not([disabled]), select, [tabindex='0']", kasten);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    dialog = {huelle, vorher: document.activeElement};
    document.body.append(huelle);
    requestAnimationFrame(() => { huelle.classList.add("da"); zu.focus({preventScroll: true}); });
    return kasten;
  }
  function dialogZu(){
    if (!dialog) return;
    const d = dialog; dialog = null;
    d.huelle.remove();
    if (d.vorher?.isConnected) d.vorher.focus?.({preventScroll: true});
  }
  function einstellungAbschnitt(titel, fn){
    const i = abschnitte.findIndex(a => a.titel === titel);
    if (i >= 0) abschnitte[i].fn = fn; else abschnitte.push({titel, fn});
  }
  function wahl(name, optionen, aktuell, fn){
    return h("div", {class: "wahl", role: "radiogroup", "aria-label": name},
      optionen.map(([wertX, text]) => {
        const b = h("button", {type: "button", role: "radio", class: "wahl-knopf" + (wertX === aktuell ? " an" : ""), "aria-checked": String(wertX === aktuell), onclick: () => {
          for (const x of b.parentNode.children) { x.classList.toggle("an", x === b); x.setAttribute("aria-checked", String(x === b)); }
          fn(wertX);
        }}, text);
        return b;
      }));
  }
  function zeile(titel, text, steuer, kann){
    const gesperrt = kann && !kann.ja;
    return h("div", {class: "einst-zeile" + (gesperrt ? " gesperrt" : "")},
      h("div", {class: "einst-text"}, h("strong", {}, titel), text ? h("span", {}, text) : null, gesperrt && kann.grund ? h("span", {class: "einst-grund"}, kann.grund) : null),
      h("div", {class: "einst-steuer", inert: gesperrt ? "" : null, "aria-disabled": gesperrt ? "true" : null}, steuer));
  }
  function schalter(an, fn, titel){
    const b = h("button", {type: "button", role: "switch", class: "schalter" + (an ? " an" : ""), "aria-checked": String(!!an), "aria-label": titel,
      onclick: () => { const neu = b.getAttribute("aria-checked") !== "true"; b.setAttribute("aria-checked", String(neu)); b.classList.toggle("an", neu); fn(neu); }}, h("span", {}));
    return b;
  }
  function eigeneAbschnitte(){
    const e = einst();
    const l = [];
    l.push({titel: "Darstellung", fn: c => c.append(
      zeile("Farbschema", "Dunkel ist der Leitstand-Look. „System“ folgt der Einstellung des Betriebssystems.",
        wahl("Farbschema", [["hell", "Hell"], ["dunkel", "Dunkel"], ["system", "System"]], e.thema || "system", v => { einstSetzen({thema: v}); themaAnwenden(); })),
      zeile("Animationen", "Pakete fliegen, Zahlen zählen hoch. „Reduziert“ blendet nur kurz ein, „Aus“ zeigt Ergebnisse sofort. Die Systemeinstellung „Bewegung reduzieren“ wird immer beachtet.",
        wahl("Animationen", [["an", "An"], ["reduziert", "Reduziert"], ["aus", "Aus"]], e.bewegung || "an", v => { einstSetzen({bewegung: v}); themaAnwenden(); })))});
    l.push({titel: "Erklärtiefe", fn: c => c.append(
      zeile("Wie ausführlich sollen Konsole und Simulation erklären?", "Einstieg erklärt jeden Schritt, AP1 knapp, AP2 zeigt nur, was ein echtes Gerät melden würde.",
        wahl("Erklärtiefe", [["E", "Einstieg"], ["AP1", "AP1"], ["AP2", "AP2"]], e.niveau || "E", v => { einstSetzen({niveau: v}); Bus.senden("niveau", v); })))});
    l.push({titel: "Leiste", fn: c => {
      const le = Object.assign({deckkraft: 0.55, ecke: "ur"}, e.leiste);
      const setzeLeiste = teil => { const x = einst(); x.leiste = Object.assign({deckkraft: 0.55, ecke: "ur"}, x.leiste, teil); store.set("einst", x); UI.leiste?.darstellen?.(); };
      const kannL = Plattform.kann("leiste");
      const prozent = h("output", {class: "einst-wert"}, Math.round(le.deckkraft * 100) + " %");
      const regler = h("input", {type: "range", min: "30", max: "100", step: "5", value: String(Math.round(le.deckkraft * 100)), "aria-label": "Deckkraft der Leiste ohne Maus",
        oninput: ev => { prozent.textContent = ev.target.value + " %"; setzeLeiste({deckkraft: +ev.target.value / 100}); }});
      c.append(zeile("Deckkraft ohne Maus", "Mit der Maus darüber ist die Leiste immer voll deckend.", h("div", {class: "regler"}, regler, prozent), kannL));
      c.append(zeile("Position", Plattform.name === "browser" ? "Im Browser: Ecke der kleinen Karte." : "Ecke des Bildschirms, an der die Leiste sitzt.",
        wahl("Position", [["ol", "oben links"], ["or", "oben rechts"], ["ul", "unten links"], ["ur", "unten rechts"]], le.ecke, v => {
          setzeLeiste({ecke: v}); try { Promise.resolve(Plattform.fenster.position(v)).catch(() => {}); } catch {}
        }), kannL));
      const kannO = Plattform.kann("immerOben");
      c.append(zeile("Immer im Vordergrund", "Die Leiste bleibt über anderen Fenstern.", schalter(!!le.immerOben, v => { setzeLeiste({immerOben: v}); try { Promise.resolve(Plattform.fenster.immerOben(v)).catch(() => {}); } catch {} }, "Immer im Vordergrund"), kannO));
      const kannA = Plattform.kann("autostart");
      const auto = schalter(false, v => { Promise.resolve(Plattform.autostart(v)).catch(err => UI.toast(`Autostart ließ sich nicht ändern: ${err.message || err}`, "fehler")); }, "Autostart");
      if (kannA.ja) Promise.resolve(Plattform.autostartStatus()).then(an => { auto.classList.toggle("an", !!an); auto.setAttribute("aria-checked", String(!!an)); }).catch(() => {});
      c.append(zeile("Mit dem Computer starten", "Startet still im Tray – nur wenn du das willst.", auto, kannA));
    }});
    return l;
  }
  function einstellungen(){
    const inhalt = h("div", {class: "einst"});
    for (const a of [...eigeneAbschnitte(), ...abschnitte]) {
      const c = h("section", {class: "einst-abschnitt"}, h("h3", {}, a.titel));
      try { a.fn(c); } catch (e) { console.error("Einstellungen", a.titel, e); c.append(h("p", {}, "Dieser Abschnitt konnte nicht geladen werden.")); }
      inhalt.append(c);
    }
    inhalt.append(h("p", {class: "einst-fuss"}, `Netzwerk-Labor ${typeof LABOR_VERSION !== "undefined" ? LABOR_VERSION : ""}${typeof LABOR_BAU !== "undefined" ? " · gebaut " + LABOR_BAU : ""} · ${Plattform.name === "tauri" ? "Desktop-Programm" : "Browser-Fassung"}`));
    dialogOeffnen("Einstellungen", inhalt, "dialog-einst");
  }
  const KUERZEL = [
    ["Überall", [["Strg+K", "Befehlspalette: Gerät springen, „ping A B“, Ebene, Ansicht"], ["?", "diese Übersicht"], ["Esc", "abbrechen, Menü schließen, Auswahl aufheben"]]],
    ["Labor – Werkzeuge", [["V", "Auswählen und verschieben"], ["K", "Kabel verlegen"], ["P", "Ping-Werkzeug (mit Auswahl: Ping von diesem Gerät)"], ["1 … 5", "Ebene: Physik · VLAN · IP-Netze · MAC · Routen"]]],
    ["Labor – Ansicht", [["F", "alles einpassen"], ["A", "aufräumen (Auto-Layout)"], ["+  −  0", "Zoom größer, kleiner, 100 %"], ["Pfeiltasten", "Ansicht verschieben (mit Auswahl: Gerät verschieben, Shift = weiter)"], ["I / S", "Inspektor / Simulation ein- und ausklappen"]]],
    ["Labor – Bearbeiten", [["Entf", "Gerät oder Kabel löschen (Rückgängig statt Nachfrage)"], ["Strg+Z", "rückgängig"], ["Strg+Y", "wiederholen"], ["C", "Konsole des gewählten Geräts"], ["Enter", "Inspektor des gewählten Geräts"]]],
    ["Maus", [["Ziehen", "Gerät verschieben · leere Fläche: Ansicht verschieben"], ["⊕ oder Port-Punkt ziehen", "Kabel (Shift beim Loslassen: Port wählen)"], ["Mausrad", "Zoom um den Mauszeiger"], ["Doppelklick", "leere Fläche: Gerät einsetzen · Gerät: Inspektor"], ["Rechtsklick", "Konsole, Ping, Strom, Neustart, Löschen"]]],
  ];
  function hilfe(){
    const inhalt = h("div", {class: "kuerzel"}, KUERZEL.map(([titel, l]) => h("section", {}, h("h3", {}, titel),
      h("dl", {}, l.map(([k, t]) => [h("dt", {}, k.split(/(\s\/\s|\s…\s|\s\s)/).map(s => s.trim() && !/^(\/|…)$/.test(s.trim()) ? h("kbd", {}, s.trim()) : s)), h("dd", {}, t)])))));
    dialogOeffnen("Tastenkürzel", inhalt, "dialog-hilfe");
  }

  /* ---------- Tastatur (eine Stelle für alles) ---------- */
  function tastenEinrichten(){
    if (tastenAn) return;
    tastenAn = true;
    document.addEventListener("keydown", e => {
      if (modus !== "voll") return;
      const t = e.target;
      const eingabe = t && t.closest && t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K")) { e.preventDefault(); UI.palette.oeffnen(); return; }
      if (dialog || UI.palette.offen) return;
      if (eingabe || e.defaultPrevented) return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); hilfe(); return; }
      if (aktiv === "labor" && t.closest?.(".labor, body") && !t.closest?.(".lb-inspektor, .lb-sim-inhalt")) {
        if (UI.labor.taste(e)) e.preventDefault();
      } else if (aktiv === "labor" && (e.ctrlKey || e.metaKey) && /^[zyZY]$/.test(e.key)) {
        if (UI.labor.taste(e)) e.preventDefault();
      }
    });
    if (typeof matchMedia !== "undefined") matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => themaAnwenden());
  }

  /* ---------- Modi: ein Fenster, zwei Ansichten ---------- */
  function modusSetzen(m){
    if (!["voll", "leiste", "tray"].includes(m) || m === modus) return;
    const alt = modus;
    try { Promise.resolve(store.sofort()).catch(e => console.warn("Speichern", e)); } catch (e) { console.warn(e); }
    UI.menue?.zu?.(); UI.palette?.schliessen?.(); dialogZu();
    const container = document.getElementById("app");
    if (alt === "voll") abbauen();
    if (m === "voll" && UI.leiste.aufgebaut) UI.leiste.abbauen();
    modus = m;
    document.documentElement.dataset.modus = m;
    if (m === "voll") aufbauen(container);
    else if (m === "leiste" && !UI.leiste.aufgebaut) UI.leiste.aufbauen(container);
    try { Promise.resolve(Plattform.fenster.modus(m)).catch(e => console.warn("Fenstermodus", e)); } catch (e) { console.warn(e); }
    Bus.senden("modus", m);
  }

  return {registrieren, ansicht, status, einstellungen, einstellungAbschnitt, hilfe, aktualisieren, liste, aufbauen, abbauen,
          themaAnwenden, themaUmschalten, istDunkel, dialogOeffnen, dialogZu, modusSetzen,
          get aktuell(){ return aktiv; }, get modus(){ return modus; }, get werte(){ return {...wert}; }};
})();

UI.modus = function(m){ if (m === undefined) return UI.app.modus; return UI.app.modusSetzen(m); };
