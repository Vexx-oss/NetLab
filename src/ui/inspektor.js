"use strict";
/* ---------- Inspektor (Konzept § 7 „Inspektor“, Architektur § 9) ----------
   UI.inspektor.zeigen(container, netz, geraetId, verlauf)   Gerät einstellen (Reiter je Gerätetyp)
   UI.inspektor.leeren(container)                             nichts ausgewählt
   UI.inspektor.reiter(container, name, {eingabe})            Reiter wechseln (z. B. "konsole" mit Befehlsvorschlag)
   Ausbau 1.2 (A3): Standardreiter „Übersicht“; Terminal/Konsole ist kein Reiter mehr, sondern ein Knopf im Kopf.
   Regeln: Jede Änderung ist genau ein Rückgängig-Schritt (verlauf.aendern → Modell). Eingaben werden beim Tippen
   geprüft (rot = so nicht möglich, gelb = möglich, aber vermutlich falsch) und bei Enter oder beim Verlassen des
   Feldes übernommen. Unter jeder Änderung zeigt „entspricht:“ den passenden Konsolenbefehl (CLI.entspricht). */
UI.inspektor = (() => {
  const ST = new WeakMap();          /* container → Zustand */
  const OFFEN = new Set();           /* sichtbare Container */
  const LETZTER_REITER = {};         /* Gerätetyp → zuletzt benutzter Reiter */

  const IOS = g => !!g && (g.typ === "router" || g.typ === "switch");
  /* Stufenregeln: dieselben „!“-Warnungen wie auf der Fläche (AP-Niveaus zeigen sie nicht oder erst mit Hilfe) */
  const warnAn = () => (UI.labor && typeof UI.labor.warnungenAn === "function") ? UI.labor.warnungenAn() : true;
  const HOST = g => !!g && Modell.HOST[g.typ];
  const cidrZuMaske = t => { const m = /^\/?\s*(\d{1,2})$/.exec(String(t).trim()); return m && +m[1] <= 32 ? IP.maske(+m[1]) : null; };
  const kurzMaske = m => IP.maskeGueltig(m) ? "/" + IP.praefix(m) : "";

  /* ---------- Reiter je Gerätetyp ---------- */
  function reiterListe(g){
    if (!g) return [];
    if (g.typ === "internet") return [["uebersicht", "Übersicht"]];
    if (g.typ === "switch") return [["uebersicht", "Übersicht"], ["ports", "Ports"], ["vlan", "VLAN"]];
    if (g.typ === "router") return [["uebersicht", "Übersicht"], ["schnitt", "Schnittstellen"], ["routing", "Routing"], ["acl", "ACL"], ["dienste", "NAT/DHCP"]];
    if (g.typ === "firewall") return [["uebersicht", "Übersicht"], ["schnitt", "Schnittstellen"], ["regeln", "Regeln"], ["routing", "Routing"], ["fwnat", "NAT"]];
    const r = [["uebersicht", "Übersicht"], ["adresse", "Adresse"]];
    if (g.typ !== "pc" || g.skin === "drucker" || Object.values(g.running.dienste || {}).some(d => d && d.an)) r.push(["dienste", "Dienste"]);
    return r;
  }
  const terminalName = g => HOST(g) ? "Terminal" : "Konsole";

  /* ---------- Öffentliche Aufrufe ---------- */
  function zeigen(container, netz, id, verlauf){
    if (!container) return;
    let K = ST.get(container);
    const neu = !K || K.netz !== netz || K.id !== id;
    if (!K) { K = {container, offen: new Set(), filterAlle: false}; ST.set(container, K); }
    K.netz = netz; K.id = id; K.verlauf = verlauf || UI.labor?.verlauf || null;
    const g = netz?.geraete[id];
    if (neu) {
      K.letzte = null; K.offen = new Set(); K.eingabe = null;
      const liste = reiterListe(g).map(r => r[0]);
      K.reiter = liste.includes(LETZTER_REITER[g?.typ]) ? LETZTER_REITER[g.typ] : liste[0];   /* liste[0] = Übersicht */
    }
    OFFEN.add(container);
    zeichnen(K);
  }
  function leeren(container){
    if (!container) return;
    ST.delete(container); OFFEN.delete(container);
    container.classList.remove("in");
    container.replaceChildren(h("div", {class: "lb-insp-leer"},
      h("div", {class: "lb-insp-leer-sym"}, UI.symbol("inspektor", 28)),
      h("strong", {}, "Nichts ausgewählt"),
      h("p", {}, "Klick ein Gerät an, um es hier einzustellen."),
      h("ul", {class: "lb-tipps"},
        h("li", {}, h("kbd", {}, "P"), " Ping: von Gerät A auf Gerät B ziehen"),
        h("li", {}, h("kbd", {}, "K"), " Kabel verlegen"),
        h("li", {}, h("kbd", {}, "Strg"), "+", h("kbd", {}, "K"), " Befehlspalette"),
        h("li", {}, h("kbd", {}, "?"), " alle Tastenkürzel"))));
  }
  function reiter(container, name, o = {}){
    const K = ST.get(container);
    if (!K) { const lab = UI.labor; if (lab?.auswahl?.geraet) { zeigen(container, lab.netz, lab.auswahl.geraet, lab.verlauf); return reiter(container, name, o); } return; }
    if (name === "konsole" && K.reiter !== "konsole") K.vorKonsole = K.reiter;
    K.reiter = name; K.eingabe = o.eingabe || null;
    zeichnen(K);
  }

  /* ---------- Neu zeichnen nach Änderungen (Fokus und Scroll bleiben) ---------- */
  let geplant = null;
  Bus.an("netz-geaendert", d => {
    if (geplant) return;
    geplant = setTimeout(() => {
      geplant = null;
      for (const c of [...OFFEN]) {
        const K = ST.get(c);
        if (!c.isConnected || !K) { OFFEN.delete(c); continue; }
        if (d && d.netz && d.netz !== K.netz) continue;
        if (!K.netz.geraete[K.id]) { leeren(c); continue; }
        if (K.reiter === "konsole") { kopfNeu(K); continue; }      /* Konsole aktualisiert sich selbst */
        zeichnen(K, true);
      }
    }, 0);
  });

  function zeichnen(K, erhalten){
    const c = K.container, g = K.netz.geraete[K.id];
    if (!g) return leeren(c);
    let fokus = null, auswahlStart = null, auswahlEnde = null, scroll = 0;
    const inhaltAlt = c.querySelector(".in-inhalt");
    if (erhalten) {
      const a = document.activeElement;
      if (a && c.contains(a) && a.dataset.key) { fokus = a.dataset.key; try { auswahlStart = a.selectionStart; auswahlEnde = a.selectionEnd; } catch (e) {} }
      scroll = inhaltAlt ? inhaltAlt.scrollTop : 0;
    }
    if (K.reiter !== "konsole") LETZTER_REITER[g.typ] = K.reiter;
    c.classList.add("in");
    K.kopfEl = h("div", {class: "in-kopf"});
    if (K.reiter === "konsole" && g.typ === "internet") K.reiter = "uebersicht";
    const reiterEl = h("div", {class: "in-reiter", role: "tablist"}, reiterListe(g).map(([name, titel]) =>
      h("button", {type: "button", role: "tab", class: "in-tab" + (K.reiter === name ? " an" : ""), "aria-selected": String(K.reiter === name),
        onclick: () => { K.reiter = name; K.eingabe = null; zeichnen(K); }}, titel)));
    const inhalt = h("div", {class: "in-inhalt"});
    c.replaceChildren(K.kopfEl, reiterEl, inhalt);
    kopfNeu(K);
    if (K.reiter === "konsole") {
      const ziel = h("div", {class: "in-konsole"});
      inhalt.classList.add("in-inhalt-konsole");
      inhalt.append(ziel);
      if (typeof UI.konsole?.oeffnen === "function") UI.konsole.oeffnen(ziel, K.netz, K.id, K.verlauf, {fokus: true, eingabe: K.eingabe || undefined});
      else ziel.append(h("p", {class: "in-leer"}, "Die Konsole ist noch nicht geladen."));
      K.eingabe = null;
      return;
    }
    const baue = {uebersicht, adresse, dienste, ports, vlan, schnitt, routing, acl, dienste_router: dienste, regeln, fwnat}[K.reiter === "dienste" && g.typ === "router" ? "dienste_router" : K.reiter] || uebersicht;
    try { baue(K, g, inhalt); }
    catch (e) { console.error("Inspektor", e); inhalt.append(h("p", {class: "in-fehler"}, "Dieser Bereich konnte nicht angezeigt werden: " + e.message)); }
    const ent = entsprichtBox(K, g);
    if (ent) c.append(ent);
    if (erhalten) {
      inhalt.scrollTop = scroll;
      if (fokus) {
        const el = c.querySelector(`[data-key="${CSS.escape(fokus)}"]`);
        if (el) { el.focus({preventScroll: true}); try { if (auswahlStart != null) el.setSelectionRange(auswahlStart, auswahlEnde); } catch (e) {} }
      }
    }
  }

  /* Kopf: Symbol, Name, Typ, Zustand, Warnungen, Speichern-Hinweis */
  function kopfNeu(K){
    const g = K.netz.geraete[K.id]; if (!g || !K.kopfEl) return;
    const art = UI.geraeteArt ? UI.geraeteArt(g.typ, g.skin) : {titel: g.typ};
    const bild = sv("svg", {viewBox: "-34 -30 68 60", width: 40, height: 36, class: "typ-" + g.typ, "aria-hidden": "true"}, UI.geraetebild ? UI.geraetebild(g.typ, g.skin) : null);
    const chips = [];
    chips.push(g.an ? h("span", {class: "in-chip ok"}, "● an") : h("span", {class: "in-chip aus"}, "○ aus"));
    const warn = warnAn() ? Modell.pruefen(K.netz).filter(w => w.geraet === g.id) : [];
    if (warn.length) chips.push(h("span", {class: "in-chip warn", title: warn.map(w => w.text).join("\n")}, `▲ ${warn.length} Hinweis${warn.length > 1 ? "e" : ""}`));
    const ungespeichert = IOS(g) && Modell.ungespeichert(g);
    const term = g.typ === "internet" ? null : h("button", {type: "button", class: "in-knopf klein in-terminal" + (K.reiter === "konsole" ? " an" : ""),
      "aria-pressed": String(K.reiter === "konsole"), title: `${terminalName(g)} von ${g.name} (Taste C)`,
      onclick: () => { if (K.reiter === "konsole") K.reiter = K.vorKonsole || "uebersicht"; else { K.vorKonsole = K.reiter; K.reiter = "konsole"; } K.eingabe = null; zeichnen(K); }},
      UI.symbol("konsole", 15), terminalName(g));
    K.kopfEl.replaceChildren(...[
      h("div", {class: "in-kopf-zeile"}, bild,
        h("div", {class: "in-kopf-text"}, h("h3", {}, g.name), h("span", {}, art.titel + (g.typ === "internet" ? " · Kulisse" : ""))),
        h("div", {class: "in-chips"}, chips, term)),
      ungespeichert ? h("div", {class: "in-speichern"},
        h("span", {}, h("b", {}, "Nicht gespeichert. "), "Die Änderungen stehen nur in der running-config (RAM). Nach einem Neustart wären sie weg."),
        h("button", {type: "button", class: "in-knopf klein warn", onclick: () => speichern(K)}, "Speichern")) : null].filter(Boolean));
  }
  function speichern(K){
    const g = K.netz.geraete[K.id];
    aendern(K, `${g.name}: Konfiguration gespeichert`, n => Modell.speichern(n.geraete[K.id]), {text: "copy running-config startup-config"});
    UI.toast?.(`${g.name}: running-config → startup-config gespeichert.`, "ok");
  }

  /* „entspricht:“ – Konsolenbefehl zur letzten Änderung */
  function entsprichtBox(K, g){
    const l = K.letzte; if (!l || !l.text) return null;
    return h("div", {class: "in-entspricht"},
      h("div", {class: "in-ent-kopf"}, h("span", {}, "entspricht:"),
        h("button", {type: "button", class: "in-knopf klein", title: "Befehl in der Konsole vorbereiten (Enter führt ihn aus)",
          onclick: () => { K.vorKonsole = K.reiter; K.reiter = "konsole"; K.eingabe = l.text; K.letzte = null; zeichnen(K); }}, HOST(g) ? "Im Terminal zeigen" : "In Konsole übernehmen")),
      h("pre", {class: "in-ent-code"}, l.text));
  }

  /* ---------- Änderungen ---------- */
  function aendern(K, beschreibung, fn, letzte){
    const netz = K.netz;
    try {
      if (K.verlauf && K.verlauf.netz === netz) K.verlauf.aendern(beschreibung, fn);
      else { fn(netz); Bus.senden("netz-geaendert", {netz, beschreibung}); }
    } catch (e) { console.error(e); UI.toast?.("Das ging nicht: " + e.message, "bad"); return false; }
    if (letzte) {
      const g = netz.geraete[K.id];
      let text = letzte.text || null;
      if (!text && letzte.pfad && g && typeof CLI !== "undefined" && typeof CLI.entspricht === "function") {
        try { text = CLI.entspricht(g, letzte.pfad, letzte.wert); } catch (e) { text = null; }
      }
      K.letzte = text ? {text} : null;
    }
    return true;
  }
  const setzen = (K, pfad, wert, beschreibung) => {
    const g = K.netz.geraete[K.id];
    return aendern(K, `${g.name}: ${beschreibung || pfad}`, n => Modell.setzen(n, K.id, pfad, wert), {pfad, wert});
  };

  /* ---------- Bausteine ---------- */
  const abschnitt = (titel, ...kinder) => h("section", {class: "in-abschnitt"}, titel ? h("h4", {}, titel) : null, ...kinder);
  const hinweis = (text, art = "") => h("p", {class: "in-hinweis " + art, html: text});

  /* Prüfen eines Eingabewerts: {art:"bad"|"warn", text} | null */
  function pruefeWert(art, w, o = {}){
    w = String(w).trim();
    if (!w) return o.pflicht ? {art: "bad", text: "Dieses Feld darf nicht leer sein."} : null;
    if (art === "ip" && !IP.gueltig(w)) return {art: "bad", text: `„${w}“ ist keine gültige IPv4-Adresse: vier Zahlen von 0 bis 255, getrennt durch Punkte.`};
    if (art === "maske") {
      const m = cidrZuMaske(w) || w;
      if (!IP.gueltig(m)) return {art: "bad", text: "Schreib die Maske als 255.255.255.0 oder kurz als /24."};
      if (!IP.maskeGueltig(m)) return {art: "bad", text: `${m} ist keine gültige Maske: erst nur Einsen, dann nur Nullen (z. B. 255.255.255.192).`};
    }
    if (art === "zahl") {
      if (!/^\d+$/.test(w)) return {art: "bad", text: "Bitte eine ganze Zahl."};
      if (o.min != null && +w < o.min || o.max != null && +w > o.max) return {art: "bad", text: `Erlaubt: ${o.min} bis ${o.max}.`};
    }
    if (art === "vlanliste" && !/^(all|alle)$/i.test(w) && !vlanListe(w)) return {art: "bad", text: "Schreib „all“ oder eine Liste wie 1,10,20 bzw. 10-30."};
    return o.zusatz ? o.zusatz(w) : null;
  }
  function vlanListe(t){
    const r = [];
    for (const teil of String(t).split(/[\s,]+/).filter(Boolean)) {
      const m = /^(\d{1,4})(?:-(\d{1,4}))?$/.exec(teil); if (!m) return null;
      const a = +m[1], b = m[2] ? +m[2] : a; if (a < 1 || b > 4094 || b < a || b - a > 4094) return null;
      for (let v = a; v <= b; v++) r.push(v);
    }
    return r.length ? [...new Set(r)].sort((x, y) => x - y) : null;
  }
  const vlanText = l => l === "all" || l == null ? "all" : kompakt(l);
  function kompakt(l){
    const s = [...l].sort((a, b) => a - b), t = [];
    for (let i = 0; i < s.length; i++) { let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++; t.push(j > i + 1 ? `${s[i]}-${s[j]}` : j === i + 1 ? `${s[i]},${s[j]}` : `${s[i]}`); i = j; }
    return t.join(",");
  }

  /* Textfeld mit Live-Prüfung. o: {key, titel, wert, art, pflicht, platz, umwandeln, uebernehmen(wert, text), modellPfad, breit, mono, klein} */
  function feld(K, o){
    const g = K.netz.geraete[K.id];
    const start = o.wert == null ? "" : String(o.wert);
    const inp = h("input", {type: "text", class: "in-eingabe" + (o.mono !== false ? " mono" : ""), value: start, placeholder: o.platz || "",
      "data-key": o.key, spellcheck: "false", autocomplete: "off", "aria-label": o.titel});
    const meldung = h("div", {class: "in-meldung", "aria-live": "polite", hidden: true});
    const modellWarn = () => o.modellPfad ? Modell.pruefen(K.netz).find(w => w.geraet === K.id && w.feld === o.modellPfad) : null;
    function pruefen(){
      let f = pruefeWert(o.art || "text", inp.value, o);
      if (!f && inp.value.trim() === start) { const w = modellWarn(); if (w) f = {art: "warn", text: w.text}; }
      if (f && f.art === "warn" && !warnAn()) f = null;          /* gelbe Vermutung nur, wo die Stufe Warnungen zeigt */
      inp.classList.toggle("bad", f?.art === "bad"); inp.classList.toggle("warn", f?.art === "warn");
      meldung.hidden = !f; meldung.className = "in-meldung " + (f?.art || ""); meldung.textContent = f ? f.text : "";
      return f;
    }
    function uebernehmen(){
      const text = inp.value.trim();
      if (text === start) return;
      const f = pruefen();
      if (f && f.art === "bad") { inp.classList.remove("wackeln"); void inp.offsetWidth; inp.classList.add("wackeln"); return; }
      let wert = text;
      if (o.art === "maske" && text) wert = cidrZuMaske(text) || text;
      if (o.art === "ip" && text) wert = IP.zuText(IP.zuZahl(text));
      if (o.art === "zahl" && text) wert = +text;
      if (o.umwandeln) wert = o.umwandeln(text);
      if (o.uebernehmen) o.uebernehmen(wert, text);
      else setzen(K, o.pfad, wert, `${o.titel} → ${text || "leer"}`);
    }
    inp.addEventListener("input", pruefen);
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); uebernehmen(); }
      else if (e.key === "Escape") { inp.value = start; pruefen(); inp.blur(); }
    });
    inp.addEventListener("blur", uebernehmen);
    pruefen();
    return h("label", {class: "in-feld" + (o.breit ? " breit" : "") + (o.klein ? " klein" : "")},
      h("span", {class: "in-feld-titel"}, o.titel, o.art === "maske" ? h("small", {}, " (auch /24)") : null), inp, meldung);
  }
  /* Schalter (Checkbox) */
  function schalter(K, o){
    const inp = h("input", {type: "checkbox", checked: !!o.an, "data-key": o.key, onchange: e => o.aendern(e.target.checked)});
    return h("label", {class: "in-schalter" + (o.klein ? " klein" : "")}, inp, h("span", {class: "in-schalter-bahn", "aria-hidden": "true"}),
      h("span", {class: "in-schalter-text"}, o.titel, o.hilfe ? h("small", {}, o.hilfe) : null));
  }
  /* Auswahl */
  function wahl(K, o){
    const sel = h("select", {class: "in-auswahl", "data-key": o.key, "aria-label": o.titel,
      onchange: e => o.aendern(e.target.value)},
      o.optionen.map(([w, t]) => h("option", {value: w, selected: String(w) === String(o.wert ?? "")}, t)));
    return h("label", {class: "in-feld" + (o.klein ? " klein" : "")}, h("span", {class: "in-feld-titel"}, o.titel), sel);
  }
  const knopf = (text, onclick, art = "", titel) => h("button", {type: "button", class: "in-knopf " + art, onclick, title: titel || null}, text);
  const statusChip = st => {
    const t = {oben: ["ok", "▲ oben"], unten: ["bad", "▼ unten"], frei: ["frei", "○ frei"], aus: ["aus", "■ aus"]}[st.status] || ["frei", st.status];
    const grund = st.grund && typeof Sim !== "undefined" && Sim.GRUENDE?.[st.grund] ? Sim.GRUENDE[st.grund].titel : st.grund || "";
    return h("span", {class: "in-chip " + t[0], title: grund || null}, t[1]);
  };
  function gegenstelle(K, port){
    const k = Modell.kabelAn(K.netz, K.id, port); if (!k) return null;
    const gg = K.netz.geraete[k.gegen.geraet];
    return gg ? `${gg.name} ${k.gegen.port}` : null;
  }

  /* ---------- Übersicht ---------- */
  function uebersicht(K, g, el){
    if (g.typ === "internet") return internet(K, g, el);
    el.append(abschnitt("Gerät",
      h("div", {class: "in-raster"},
        feld(K, {key: "name", titel: IOS(g) ? "Name (hostname)" : "Name", wert: g.name, mono: false, pflicht: true,
          uebernehmen: w => aendern(K, `Umbenannt in ${w}`, n => Modell.geraetSetzen(n, K.id, "name", w), IOS(g) ? {text: `hostname ${w}`} : null)})),
      schalter(K, {key: "strom", titel: "Strom", an: g.an, hilfe: g.an ? "Eingeschaltet" : "Ausgeschaltet – das Gerät sendet und antwortet nicht.",
        aendern: an => { aendern(K, `${g.name}: Strom ${an ? "an" : "aus"}`, n => Modell.geraetSetzen(n, K.id, "an", an)); UI.konsole?.zuruecksetzen?.(K.netz, K.id, an ? "— Gerät eingeschaltet —" : "— Gerät ausgeschaltet —"); }}),
      h("div", {class: "in-zeile"},
        IOS(g) ? knopf("Speichern (copy run start)", () => speichern(K), Modell.ungespeichert(g) ? "primaer" : "") : null,
        knopf("Neustart", () => neustart(K), "", IOS(g) ? "Lädt die startup-config. Ungespeichertes geht verloren – wie beim echten Gerät." : "Leert ARP-Cache und DHCP-Lease."))));
    const warn = warnAn() ? Modell.pruefen(K.netz).filter(w => w.geraet === g.id) : [];
    if (warn.length) el.append(abschnitt("Hinweise", h("ul", {class: "in-warnliste"}, warn.map(w => h("li", {}, w.text)))));
    const ports = Modell.ports(g), belegt = ports.filter(p => Modell.kabelAn(K.netz, g.id, p));
    const zeigen = g.typ === "switch" ? belegt : ports;
    el.append(abschnitt(`Anschlüsse (${belegt.length} von ${ports.length} belegt)`,
      zeigen.length ? h("table", {class: "in-tabelle"}, h("tbody", {}, zeigen.map(p => h("tr", {class: "klickbar", onclick: () => UI.labor?.hervorheben?.([{geraet: g.id, port: p}], 1600)},
        h("td", {class: "mono"}, p), h("td", {}, statusChip(Modell.portStatus(K.netz, g.id, p))), h("td", {class: "in-gegen"}, gegenstelle(K, p) || "—"))))) :
        hinweis("Noch kein Kabel. Zieh auf der Fläche vom Gerät zu einem anderen, um es zu verbinden.")));
    if (IOS(g)) el.append(abschnitt("Konfiguration",
      hinweis(g.startup ? "Eine startup-config ist gespeichert (NVRAM)." : "Noch keine startup-config: Nach einem Neustart startet das Gerät im Werkszustand."),
      g.typ === "switch" ? hinweis("Die VLANs liegen nicht in der Konfiguration, sondern in <code>flash:vlan.dat</code>. Sie überleben „write erase“ und Neustart.") : null));
  }
  function neustart(K){
    const g = K.netz.geraete[K.id];
    aendern(K, `${g.name}: Neustart`, n => { if (IOS(g)) Modell.neustart(n, K.id); else n.zustand[K.id] = {}; }, IOS(g) ? {text: "reload"} : null);
    UI.konsole?.zuruecksetzen?.(K.netz, K.id, "— Neustart —");
    UI.toast?.(IOS(g) ? `${g.name} startet neu und lädt die startup-config.` : `${g.name} startet neu.`, "info");
  }
  function internet(K, g, el){
    const k = g.running;
    el.append(abschnitt("Was ist das?", hinweis("Das Internet ist hier Kulisse: Es steht für den Provider und alles dahinter. Es leitet Pakete an öffentliche Adressen weiter und verwirft Pakete mit privater Absenderadresse – deshalb braucht dein Router NAT.")),
      abschnitt("Anschlüsse", h("table", {class: "in-tabelle"}, h("tbody", {}, Object.entries(k.if).map(([p, i]) => h("tr", {},
        h("td", {class: "mono"}, p), h("td", {class: "mono"}, i.ip ? `${i.ip}${kurzMaske(i.maske)}` : "—"), h("td", {class: "in-gegen"}, gegenstelle(K, p) || "—")))))),
      abschnitt("Öffentliche Server", h("table", {class: "in-tabelle"}, h("tbody", {}, (k.server || []).map(s => h("tr", {},
        h("td", {}, s.name), h("td", {class: "mono"}, s.ip), h("td", {}, (s.dienste || []).join(", ")))))),
        hinweis("Zum Testen: <code>ping 198.51.100.10</code> oder im Browser eines PCs <code>http://www.beispiel.de</code>. Diese Adressen stammen aus dem Dokumentationsbereich (RFC 5737).")));
  }

  /* ---------- Hosts: Adresse ---------- */
  function adresse(K, g, el){
    for (const p of Object.keys(g.running.if)) {
      const i = g.running.if[p], pf = `if.${p}`;
      const teile = [
        h("div", {class: "in-zeile zwischen"}, h("span", {class: "mono in-port"}, p === "eth0" ? "Ethernet (eth0)" : p), statusChip(Modell.portStatus(K.netz, g.id, p))),
        schalter(K, {key: pf + ".dhcp", titel: "Adresse automatisch beziehen (DHCP)", an: i.dhcp,
          aendern: an => setzen(K, pf + ".dhcp", an, `DHCP ${an ? "an" : "aus"}`)})];
      if (i.dhcp) {
        const a = typeof Sim !== "undefined" && Sim.adresse ? Sim.adresse(K.netz, g.id, p) : null;
        const q = a ? {dhcp: "per DHCP bezogen", apipa: "APIPA – kein DHCP-Server geantwortet", statisch: "statisch", keine: "noch keine Adresse"}[a.quelle] || a.quelle : "";
        teile.push(h("div", {class: "in-karte"},
          a && a.ip ? h("dl", {class: "in-werte"}, h("dt", {}, "Adresse"), h("dd", {class: "mono"}, `${a.ip}${kurzMaske(a.maske)}`),
            h("dt", {}, "Gateway"), h("dd", {class: "mono"}, a.gw || "—"), h("dt", {}, "DNS"), h("dd", {class: "mono"}, a.dns || "—"),
            h("dt", {}, "Herkunft"), h("dd", {class: a.quelle === "apipa" ? "warn" : ""}, q)) : hinweis("Noch keine Adresse. Der Rechner fragt beim nächsten Senden per DHCP (Discover, Offer, Request, Ack)."),
          h("div", {class: "in-zeile"}, knopf("Adresse erneuern", () => dhcpErneuern(K, p), "", "ipconfig /renew – zeigt DORA in der Simulation"))));
      } else {
        teile.push(h("div", {class: "in-raster"},
          feld(K, {key: pf + ".ip", titel: "IP-Adresse", wert: i.ip, art: "ip", pfad: pf + ".ip", modellPfad: pf + ".ip", platz: "z. B. 192.168.1.10"}),
          feld(K, {key: pf + ".maske", titel: "Subnetzmaske", wert: i.maske, art: "maske", pfad: pf + ".maske", modellPfad: pf + ".maske", platz: "255.255.255.0"}),
          feld(K, {key: pf + ".gw", titel: "Standardgateway", wert: i.gw, art: "ip", pfad: pf + ".gw", modellPfad: pf + ".gw", platz: "Router im eigenen Netz",
            zusatz: w => IP.gueltig(w) && IP.gueltig(i.ip) && IP.maskeGueltig(i.maske) && !IP.gleichesNetz(w, i.ip, i.maske)
              ? {art: "warn", text: `${w} liegt nicht im Netz ${IP.cidr(i.ip, i.maske)} – der Rechner kann dieses Gateway nicht direkt erreichen.`} : null}),
          feld(K, {key: pf + ".dns", titel: "DNS-Server", wert: i.dns, art: "ip", pfad: pf + ".dns", modellPfad: pf + ".dns", platz: "optional"})));
        if (IP.gueltig(i.ip) && IP.maskeGueltig(i.maske)) teile.push(hinweis(`Netz: <b class="mono">${IP.cidr(i.ip, i.maske)}</b> · Broadcast <span class="mono">${IP.broadcast(i.ip, i.maske)}</span>`, "klein"));
      }
      teile.push(schalter(K, {key: pf + ".an", titel: "Netzwerkkarte aktiviert", an: i.an !== false, klein: true, aendern: an => setzen(K, pf + ".an", an, `Netzwerkkarte ${an ? "an" : "aus"}`)}));
      el.append(abschnitt(null, ...teile));
    }
  }
  function dhcpErneuern(K, port){
    if (typeof Sim === "undefined" || !Sim.dhcp) return;
    const g = K.netz.geraete[K.id];
    let r;
    aendern(K, `${g.name}: Adresse erneuert`, n => { r = Sim.dhcp(n, K.id, port); }, {text: "ipconfig /renew"});
    if (!r) return;
    UI.toast?.(r.ok ? `${g.name} hat ${r.lease?.ip || "eine Adresse"} bekommen.` : `Kein DHCP-Angebot – ${g.name} nimmt eine APIPA-Adresse (169.254.x.x).`, r.ok ? "ok" : "warn");
    if (r.trace) UI.labor?.zeigeTrace?.(r.trace);
  }

  /* ---------- Hosts: Dienste ---------- */
  function dienste(K, g, el){
    if (g.typ === "router") return dienstRouter(K, g, el);
    const d = g.running.dienste || {};
    el.append(abschnitt("Dienste", hinweis("Ein eingeschalteter Dienst lauscht auf seinem Port. Ist er aus, antwortet der Rechner mit einem TCP-Reset (Port geschlossen)."),
      ...Object.entries(Modell.DIENSTPORTS).map(([name, info]) => schalter(K, {key: "d." + name, titel: info.name, hilfe: `${info.proto.toUpperCase()}/${info.port}`,
        an: !!(d[name] && d[name].an), klein: true,
        aendern: an => setzen(K, `dienste.${name}`, Object.assign({}, d[name] || {}, {an}), `${info.name} ${an ? "an" : "aus"}`)}))));
    if (d.dns && d.dns.an) {
      const eintraege = d.dns.eintraege || [];
      el.append(abschnitt("DNS-Einträge (A-Records)",
        eintraege.length ? h("table", {class: "in-tabelle"}, h("tbody", {}, eintraege.map((e, i) => h("tr", {},
          h("td", {}, e.name), h("td", {class: "mono"}, e.ip),
          h("td", {class: "rechts"}, knopf("✕", () => setzen(K, "dienste.dns.eintraege", eintraege.filter((_, j) => j !== i), `DNS-Eintrag ${e.name} gelöscht`), "klein geist", "Löschen")))))) : hinweis("Noch keine Einträge."),
        neuZeile(K, "dns", [["name", "Name", "intranet.firma.local", "text"], ["ip", "Adresse", "192.168.1.5", "ip"]],
          w => setzen(K, "dienste.dns.eintraege", [...eintraege, {name: w.name.toLowerCase(), ip: w.ip}], `DNS-Eintrag ${w.name}`))));
    }
    if (d.dhcp && d.dhcp.an) {
      const pools = d.dhcp.pools || [];
      el.append(abschnitt("DHCP-Pools", pools.map((p, i) => poolKarte(K, "dienste.dhcp.pools", pools, i, true)),
        knopf("+ Pool anlegen", () => setzen(K, "dienste.dhcp.pools", [...pools, {name: "LAN" + (pools.length + 1), netz: "", maske: "255.255.255.0", gw: "", dns: "", start: "", anzahl: 50}], "DHCP-Pool angelegt"), "klein")));
    }
  }
  /* Pool-Karte (Server: mit start/anzahl; Router: netz/maske/gw/dns) */
  function poolKarte(K, pfad, pools, i, server){
    const p = pools[i], neu = (feldName, wert) => setzen(K, pfad, pools.map((x, j) => j === i ? Object.assign({}, x, {[feldName]: wert}) : x), `Pool ${p.name}: ${feldName}`);
    const f = (name, titel, art, platz) => feld(K, {key: `${pfad}.${i}.${name}`, titel, wert: p[name], art, platz, uebernehmen: w => neu(name, w)});
    return h("div", {class: "in-karte"},
      h("div", {class: "in-zeile zwischen"}, h("b", {}, "Pool " + p.name),
        knopf("Löschen", () => setzen(K, pfad, pools.filter((_, j) => j !== i), `Pool ${p.name} gelöscht`), "klein geist")),
      h("div", {class: "in-raster"},
        f("name", "Name", "text"), f("netz", "Netz", "ip", "192.168.10.0"), f("maske", "Maske", "maske", "255.255.255.0"),
        f("gw", server ? "Gateway" : "default-router", "ip", "Router-Adresse"), f("dns", "DNS-Server", "ip", "optional"),
        server ? f("start", "Erste Adresse", "ip") : null,
        server ? feld(K, {key: `${pfad}.${i}.anzahl`, titel: "Anzahl", wert: p.anzahl, art: "zahl", min: 1, max: 1000, uebernehmen: w => neu("anzahl", +w)}) : null));
  }
  /* Zeile zum Hinzufügen: felder [[name, titel, platz, art]] → onAdd(werte) */
  function neuZeile(K, key, felder, onAdd, knopfText = "Hinzufügen"){
    const werte = {}, inputs = {};
    const meldung = h("div", {class: "in-meldung bad", hidden: true});
    const zeile = h("div", {class: "in-neu"}, felder.map(([name, titel, platz, art]) => {
      const inp = h("input", {type: "text", class: "in-eingabe mono", placeholder: platz || "", "aria-label": titel, "data-key": `neu.${key}.${name}`,
        onkeydown: e => { if (e.key === "Enter") { e.preventDefault(); los(); } }});
      inputs[name] = inp;
      return h("label", {class: "in-feld klein"}, h("span", {class: "in-feld-titel"}, titel), inp);
    }), knopf(knopfText, () => los(), "klein"), meldung);
    function los(){
      for (const [name, titel, , art] of felder) {
        const w = inputs[name].value.trim();
        const f = pruefeWert(art || "text", w, {pflicht: art !== "optional"});
        if (f && f.art === "bad") { meldung.hidden = false; meldung.textContent = `${titel}: ${f.text}`; inputs[name].focus(); return; }
        werte[name] = art === "maske" ? (cidrZuMaske(w) || w) : art === "ip" && w ? IP.zuText(IP.zuZahl(w)) : w;
      }
      onAdd(werte);
    }
    return zeile;
  }

  /* ---------- Switch: Ports ---------- */
  function ports(K, g, el){
    const k = g.running, vlans = g.flash?.vlans || {};
    const svi1 = Object.entries(k.svi || {});
    el.append(abschnitt("Verwaltung (SVI)",
      ...svi1.map(([v, s]) => h("div", {class: "in-karte"},
        h("div", {class: "in-zeile zwischen"}, h("b", {class: "mono"}, "interface vlan " + v),
          schalter(K, {key: `svi.${v}.an`, titel: "an", an: !s.shutdown, klein: true, aendern: an => setzen(K, `svi.${v}.shutdown`, !an, `Vlan${v} ${an ? "no shutdown" : "shutdown"}`)})),
        h("div", {class: "in-raster"},
          feld(K, {key: `svi.${v}.ip`, titel: "IP-Adresse", wert: s.ip, art: "ip", pfad: `svi.${v}.ip`}),
          feld(K, {key: `svi.${v}.maske`, titel: "Maske", wert: s.maske, art: "maske", pfad: `svi.${v}.maske`})))),
      h("div", {class: "in-raster"}, feld(K, {key: "dgw", titel: "ip default-gateway", wert: k.defaultGateway, art: "ip", pfad: "defaultGateway"})),
      hinweis("Die Verwaltungsadresse braucht der Switch nur, um selbst erreichbar zu sein (Ping, SSH). Für das Weiterleiten der Frames spielt sie keine Rolle.", "klein")));
    const alle = Modell.ports(g), belegt = alle.filter(p => Modell.kabelAn(K.netz, g.id, p) || k.ports[p].modus === "trunk" || k.ports[p].accessVlan !== 1 || k.ports[p].shutdown);
    const liste = K.filterAlle ? alle : belegt;
    const tabelle = h("div", {class: "in-portliste"}, liste.map(p => portZeile(K, g, p, vlans)));
    el.append(abschnitt(`Ports (${K.filterAlle ? "alle " + alle.length : belegt.length + " belegt oder eingestellt"})`,
      liste.length ? tabelle : hinweis("Noch keine Ports belegt."),
      knopf(K.filterAlle ? "Nur belegte zeigen" : `Alle ${alle.length} Ports zeigen`, () => { K.filterAlle = !K.filterAlle; zeichnen(K); }, "klein geist")));
  }
  function portZeile(K, g, p, vlans){
    const cfg = g.running.ports[p], pf = `ports.${p}`, auf = K.offen.has(p);
    const st = Modell.portStatus(K.netz, g.id, p);
    const vlanFarbe = v => `var(--vlan-${((+v - 1) % 8 + 8) % 8 + 1})`;
    const kopf = h("div", {class: "in-port-kopf" + (auf ? " auf" : "")},
      h("button", {type: "button", class: "in-port-name mono", "aria-expanded": String(auf), onclick: () => { auf ? K.offen.delete(p) : K.offen.add(p); zeichnen(K); }}, (auf ? "▾ " : "▸ ") + p),
      statusChip(st),
      wahl(K, {key: pf + ".modus", titel: "Modus", wert: cfg.modus, klein: true, optionen: [["access", "access"], ["trunk", "trunk"]],
        aendern: v => setzen(K, pf + ".modus", v, `${p}: switchport mode ${v}`)}),
      cfg.modus === "access"
        ? h("span", {class: "in-vlan-chip", style: {"--v": vlanFarbe(cfg.accessVlan)}}, feld(K, {key: pf + ".accessVlan", titel: "VLAN", wert: cfg.accessVlan, art: "zahl", min: 1, max: 4094, pfad: pf + ".accessVlan", klein: true,
            zusatz: w => vlans[w] ? null : {art: "warn", text: `VLAN ${w} gibt es in der VLAN-Datenbank noch nicht – der Port wäre inaktiv. Leg es im Reiter VLAN an.`}}))
        : h("span", {class: "in-chip info"}, "802.1Q · " + vlanText(cfg.trunkErlaubt)));
    const teile = [kopf];
    if (auf) {
      const gegen = gegenstelle(K, p);
      teile.push(h("div", {class: "in-port-details"},
        gegen ? hinweis(`Kabel zu <b>${esc(gegen)}</b>`, "klein") : hinweis("Kein Kabel angeschlossen.", "klein"),
        schalter(K, {key: pf + ".an", titel: "Port eingeschaltet (no shutdown)", an: !cfg.shutdown, klein: true, aendern: an => setzen(K, pf + ".shutdown", !an, `${p}: ${an ? "no shutdown" : "shutdown"}`)}),
        feld(K, {key: pf + ".beschreibung", titel: "Beschreibung", wert: cfg.beschreibung, mono: false, pfad: pf + ".beschreibung", breit: true}),
        cfg.modus === "trunk" ? h("div", {class: "in-raster"},
          feld(K, {key: pf + ".trunkErlaubt", titel: "Erlaubte VLANs", wert: vlanText(cfg.trunkErlaubt), art: "vlanliste", platz: "all oder 1,10,20",
            uebernehmen: (w, t) => setzen(K, pf + ".trunkErlaubt", /^(all|alle)$/i.test(t) ? "all" : vlanListe(t), `${p}: switchport trunk allowed vlan ${t}`)}),
          feld(K, {key: pf + ".nativeVlan", titel: "Native VLAN", wert: cfg.nativeVlan, art: "zahl", min: 1, max: 4094, pfad: pf + ".nativeVlan",
            zusatz: () => ({art: "warn", text: "Beide Enden eines Trunks brauchen dasselbe Native VLAN – sonst landen ungetaggte Frames im falschen VLAN."})})) : null,
        schalter(K, {key: pf + ".ps", titel: "Port-Security", an: !!cfg.portSecurity, klein: true, hilfe: "Nur bekannte MAC-Adressen dürfen senden",
          aendern: an => setzen(K, pf + ".portSecurity", an ? {max: 1, verstoss: "shutdown", macs: []} : null, `${p}: port-security ${an ? "an" : "aus"}`)}),
        cfg.portSecurity ? h("div", {class: "in-raster"},
          feld(K, {key: pf + ".psmax", titel: "Höchstens MACs", wert: cfg.portSecurity.max, art: "zahl", min: 1, max: 132, pfad: pf + ".portSecurity.max"}),
          wahl(K, {key: pf + ".psv", titel: "Bei Verstoß", wert: cfg.portSecurity.verstoss, optionen: [["shutdown", "shutdown (err-disabled)"], ["restrict", "restrict (verwerfen, zählen)"], ["protect", "protect (still verwerfen)"]],
            aendern: v => setzen(K, pf + ".portSecurity.verstoss", v, `${p}: violation ${v}`)})) : null,
        K.netz.zustand?.[g.id]?.errdisabled?.[p] ? h("div", {class: "in-zeile"}, hinweis("Der Port ist <b>err-disabled</b> (Verstoß gegen Port-Security).", "bad"),
          knopf("Port zurücksetzen", () => aendern(K, `${p}: err-disabled aufgehoben`, n => { delete n.zustand[g.id].errdisabled[p]; }, {text: `interface ${p}\n shutdown\n no shutdown`}), "klein")) : null));
    }
    return h("div", {class: "in-port" + (auf ? " auf" : "")}, teile);
  }

  /* ---------- Switch: VLAN-Datenbank ---------- */
  function vlan(K, g, el){
    const vlans = g.flash?.vlans || {}, k = g.running;
    const mitglieder = v => Modell.ports(g).filter(p => k.ports[p].modus === "access" && String(k.ports[p].accessVlan) === String(v));
    const trunks = Modell.ports(g).filter(p => k.ports[p].modus === "trunk");
    el.append(abschnitt("VLAN-Datenbank",
      hinweis("Liegt in <code>flash:vlan.dat</code>, nicht in der running-config. Sie überlebt „write erase“ und Neustart; weg ist sie erst mit <code>delete flash:vlan.dat</code>.", "klein"),
      h("div", {class: "in-vlanliste"}, Object.keys(vlans).sort((a, b) => a - b).map(v => {
        const m = mitglieder(v);
        return h("div", {class: "in-karte", style: {"--v": `var(--vlan-${((+v - 1) % 8 + 8) % 8 + 1})`}},
          h("div", {class: "in-zeile zwischen"}, h("b", {class: "in-vlan-nr"}, "VLAN " + v),
            v === "1" ? h("small", {class: "in-leise"}, "Standard, nicht löschbar") :
              knopf("Löschen", () => aendern(K, `VLAN ${v} gelöscht`, n => Modell.vlan(n, g.id, v, null), {text: `no vlan ${v}`}), "klein geist")),
          feld(K, {key: `vlan.${v}.name`, titel: "Name", wert: vlans[v].name, mono: false, breit: true,
            uebernehmen: w => aendern(K, `VLAN ${v} heißt ${w}`, n => Modell.vlan(n, g.id, v, w), {text: `vlan ${v}\n name ${w}`})}),
          hinweis(m.length ? `Access-Ports: <span class="mono">${m.join(", ")}</span>` : "Noch kein Access-Port in diesem VLAN.", "klein"));
      })),
      trunks.length ? hinweis(`Trunks (tragen alle erlaubten VLANs): <span class="mono">${trunks.join(", ")}</span>`, "klein") : null),
      abschnitt("VLAN anlegen", neuZeile(K, "vlan", [["nr", "Nummer", "10", "zahl"], ["name", "Name", "Verwaltung", "text"]], w => {
        if (+w.nr < 2 || +w.nr > 4094 || (+w.nr >= 1002 && +w.nr <= 1005)) { UI.toast?.("Erlaubt sind 2–1001 und 1006–4094 (1002–1005 sind reserviert).", "warn"); return; }
        aendern(K, `VLAN ${w.nr} angelegt`, n => Modell.vlan(n, g.id, +w.nr, w.name), {text: `vlan ${w.nr}\n name ${w.name}`});
      }, "Anlegen")));
  }

  /* ---------- Router/Firewall: Schnittstellen ---------- */
  function schnitt(K, g, el){
    const k = g.running, fw = g.typ === "firewall";
    const physisch = Modell.ports(g);
    if (!fw) el.append(hinweis("Router-Schnittstellen sind ab Werk <b>abgeschaltet</b> (shutdown). Einschalten nicht vergessen.", "klein"));
    for (const p of physisch) {
      el.append(ifKarte(K, g, p, false));
      if (!fw) for (const sub of Object.keys(k.if).filter(n => n.startsWith(p + ".")).sort((a, b) => +a.split(".")[1] - +b.split(".")[1])) el.append(ifKarte(K, g, sub, true));
    }
  }
  function ifKarte(K, g, name, sub){
    const k = g.running, i = k.if[name] || {}, pf = `if.${name}`, fw = g.typ === "firewall";
    const auf = K.offen.has(name) || !!(i.ip) || sub;
    const st = sub ? {status: i.shutdown ? "aus" : Modell.portStatus(K.netz, g.id, name.split(".")[0]).status} : Modell.portStatus(K.netz, g.id, name);
    const aclOpt = [["", "keine"], ...Object.keys(k.acls || {}).map(a => [a, a])];
    const kopf = h("div", {class: "in-zeile zwischen"},
      h("button", {type: "button", class: "in-if-name mono", onclick: () => { K.offen.has(name) ? K.offen.delete(name) : K.offen.add(name); zeichnen(K); }},
        (sub ? "↳ " : "") + name, i.ip ? h("small", {}, `  ${i.ip}${kurzMaske(i.maske)}`) : null),
      h("span", {class: "in-zeile"}, statusChip(st), sub ? null : h("small", {class: "in-leise"}, gegenstelle(K, name) || "")));
    const teile = [kopf];
    if (auf || K.offen.has(name)) {
      teile.push(schalter(K, {key: pf + ".an", titel: sub ? "Subinterface an" : "Eingeschaltet (no shutdown)", an: !i.shutdown, klein: true,
        aendern: an => setzen(K, pf + ".shutdown", !an, `${name}: ${an ? "no shutdown" : "shutdown"}`)}));
      if (sub) teile.push(h("div", {class: "in-raster"},
        feld(K, {key: pf + ".vlan", titel: "VLAN (dot1Q)", wert: i.vlan, art: "zahl", min: 1, max: 4094, pfad: pf + ".vlan"}),
        schalter(K, {key: pf + ".nativ", titel: "native (ungetaggt)", an: !!i.nativ, klein: true, aendern: an => setzen(K, pf + ".nativ", an, `${name}: native ${an ? "an" : "aus"}`)})));
      teile.push(h("div", {class: "in-raster"},
        feld(K, {key: pf + ".ip", titel: "IP-Adresse", wert: i.ip, art: "ip", pfad: pf + ".ip", modellPfad: pf + ".ip"}),
        feld(K, {key: pf + ".maske", titel: "Maske", wert: i.maske, art: "maske", pfad: pf + ".maske"})));
      if (fw) teile.push(wahl(K, {key: pf + ".zone", titel: "Zone", wert: i.zone || "", optionen: [["", "keine"], ["innen", "innen"], ["aussen", "außen"], ["dmz", "DMZ"]],
        aendern: v => setzen(K, pf + ".zone", v || null, `${name}: Zone ${v || "keine"}`)}));
      else {
        teile.push(h("div", {class: "in-raster"},
          wahl(K, {key: pf + ".nat", titel: "NAT-Rolle", wert: i.nat || "", optionen: [["", "keine"], ["inside", "inside (innen)"], ["outside", "outside (außen)"]],
            aendern: v => setzen(K, pf + ".nat", v || null, `${name}: ip nat ${v || "aus"}`)}),
          wahl(K, {key: pf + ".aclIn", titel: "ACL eingehend", wert: i.aclIn || "", optionen: aclOpt, aendern: v => setzen(K, pf + ".aclIn", v || null, `${name}: ACL in ${v || "keine"}`)}),
          wahl(K, {key: pf + ".aclOut", titel: "ACL ausgehend", wert: i.aclOut || "", optionen: aclOpt, aendern: v => setzen(K, pf + ".aclOut", v || null, `${name}: ACL out ${v || "keine"}`)}),
          feld(K, {key: pf + ".helper", titel: "ip helper-address", wert: (i.helper || []).join(", "), platz: "DHCP-Server in anderem Netz",
            zusatz: w => w.split(/[\s,]+/).filter(Boolean).every(IP.gueltig) ? null : {art: "bad", text: "Nur IP-Adressen, getrennt durch Komma."},
            uebernehmen: w => setzen(K, pf + ".helper", String(w).split(/[\s,]+/).filter(Boolean), `${name}: ip helper-address ${w || "entfernt"}`)})));
        teile.push(feld(K, {key: pf + ".beschreibung", titel: "Beschreibung", wert: i.beschreibung, mono: false, pfad: pf + ".beschreibung", breit: true}));
        if (sub) teile.push(knopf("Subinterface löschen", () => aendern(K, `${name} gelöscht`, n => Modell.loeschen(n, g.id, pf), {text: `no interface ${name.replace(/^Gi/, "GigabitEthernet")}`}), "klein geist"));
        else teile.push(neuZeile(K, "sub." + name, [["vlan", "Subinterface für VLAN", "10", "zahl"]], w => {
          const v = +w.vlan;
          if (k.if[`${name}.${v}`]) { UI.toast?.(`${name}.${v} gibt es schon.`, "warn"); return; }
          K.offen.add(`${name}.${v}`);
          aendern(K, `${name}.${v} angelegt`, n => Modell.setzen(n, g.id, `if.${name}.${v}`, Modell.subIf(v)), {text: `interface ${name.replace(/^Gi/, "GigabitEthernet")}.${v}\n encapsulation dot1Q ${v}`});
        }, "Subinterface anlegen"));
      }
    }
    return h("div", {class: "in-karte in-if" + (sub ? " sub" : "")}, teile);
  }

  /* ---------- Routing ---------- */
  function routing(K, g, el){
    const routen = g.running.routen || [];
    const ifs = Object.keys(g.running.if);
    el.append(abschnitt("Statische Routen",
      routen.length ? h("table", {class: "in-tabelle"}, h("tbody", {}, routen.map((r, i) => h("tr", {},
        h("td", {class: "mono"}, r.netz === "0.0.0.0" && r.maske === "0.0.0.0" ? "0.0.0.0/0 (Default)" : `${r.netz}${kurzMaske(r.maske)}`),
        h("td", {class: "mono"}, r.nh ? "via " + r.nh : r.aus ? "über " + r.aus : "—"),
        h("td", {class: "rechts"}, knopf("✕", () => aendern(K, `Route ${r.netz}${kurzMaske(r.maske)} gelöscht`, n => Modell.setzen(n, g.id, "routen", routen.filter((_, j) => j !== i)),
          {text: `no ip route ${r.netz} ${r.maske} ${r.nh || r.aus}`}), "klein geist", "Löschen")))))) : hinweis("Keine statischen Routen. Direkt angeschlossene Netze kennt der Router von selbst."),
      neuZeile(K, "route", [["netz", "Zielnetz", "10.0.2.0", "ip"], ["maske", "Maske", "/24", "maske"], ["nh", "Next Hop", "10.0.1.2", "ip"]], w => {
        if (IP.netz(w.netz, w.maske) !== w.netz) { UI.toast?.(`${w.netz} ist keine Netzadresse für ${w.maske} (Netz wäre ${IP.netz(w.netz, w.maske)}). IOS meldet: % Inconsistent address and mask`, "warn"); return; }
        aendern(K, `Route ${w.netz}${kurzMaske(w.maske)} via ${w.nh}`, n => Modell.setzen(n, g.id, "routen", [...routen, {netz: w.netz, maske: w.maske, nh: w.nh, aus: null, ad: 1}]),
          {text: `ip route ${w.netz} ${w.maske} ${w.nh}`});
      }, "Route anlegen"),
      h("div", {class: "in-zeile"}, knopf("Default-Route vorbereiten", () => {
        const f = el.querySelector('[data-key="neu.route.netz"]'), m = el.querySelector('[data-key="neu.route.maske"]');
        if (f && m) { f.value = "0.0.0.0"; m.value = "0.0.0.0"; el.querySelector('[data-key="neu.route.nh"]')?.focus(); }
      }, "klein geist", "0.0.0.0/0 – alles, wofür es keine genauere Route gibt"))));
    if (typeof Sim !== "undefined" && Sim.routingTabelle) {
      const t = Sim.routingTabelle(K.netz, g.id);
      el.append(abschnitt("Routingtabelle (wirksam)",
        t.length ? h("table", {class: "in-tabelle mono"}, h("tbody", {}, t.map(r => h("tr", {},
          h("td", {class: "in-code-" + r.typ}, r.typ === "S" && r.praefix === 0 ? "S*" : r.typ),
          h("td", {}, `${r.netz}/${r.praefix}`), h("td", {}, r.nh ? "via " + r.nh : r.aus || ""))))) : hinweis("Leer – keine Schnittstelle ist eingeschaltet und adressiert."),
        hinweis("C = direkt angeschlossen, S = statisch, S* = Default-Route. Längster passender Präfix gewinnt.", "klein")));
    }
    if (!ifs.length) el.append(hinweis("Keine Schnittstellen."));
  }

  /* ---------- Router: ACL ---------- */
  const ANY = {ip: "0.0.0.0", wc: "255.255.255.255"};
  function adrText(a){ if (!a || a.wc === "255.255.255.255") return "any"; if (a.wc === "0.0.0.0") return "host " + a.ip; return `${a.ip} ${a.wc}`; }
  function adrLesen(t){
    t = String(t || "").trim().toLowerCase();
    if (!t || t === "any") return ANY;
    let m = /^host\s+(\S+)$/.exec(t); if (m && IP.gueltig(m[1])) return {ip: m[1], wc: "0.0.0.0"};
    if (IP.gueltig(t)) return {ip: t, wc: "0.0.0.0"};
    const c = IP.ausCidr(t); if (c) return {ip: c.netz, wc: IP.wildcard(c.maske)};
    m = /^(\S+)\s+(\S+)$/.exec(t); if (m && IP.gueltig(m[1]) && IP.gueltig(m[2])) return {ip: m[1], wc: m[2]};
    return null;
  }
  const portText = p => !p ? "" : p.op === "range" ? ` range ${p.ports[0]} ${p.ports[1]}` : ` ${p.op} ${p.ports[0]}`;
  const regelText = (r, standard) => standard ? `${r.aktion} ${adrText(r.quelle)}` :
    `${r.aktion} ${r.proto} ${adrText(r.quelle)}${portText(r.quellPort)} ${adrText(r.ziel)}${portText(r.zielPort)}${r.icmpTyp ? " " + r.icmpTyp : ""}`;
  function aclBefehl(name, a){
    const nummer = /^\d+$/.test(name);
    if (nummer) return a.regeln.map(r => `access-list ${name} ${regelText(r, a.typ === "standard")}`).join("\n");
    return `ip access-list ${a.typ === "standard" ? "standard" : "extended"} ${name}\n` + a.regeln.map(r => " " + regelText(r, a.typ === "standard")).join("\n");
  }
  function acl(K, g, el){
    const acls = g.running.acls || {};
    const bindung = name => Object.entries(g.running.if).flatMap(([p, i]) => [i.aclIn === name ? `${p} in` : null, i.aclOut === name ? `${p} out` : null]).filter(Boolean);
    el.append(hinweis("Regeln werden <b>von oben nach unten</b> geprüft, die erste passende gewinnt. Am Ende steht unsichtbar <code>deny any</code>. Standard-ACLs prüfen nur den Absender – setz sie nah ans Ziel.", "klein"));
    for (const [name, a] of Object.entries(acls)) {
      const std = a.typ === "standard", b = bindung(name);
      const neu = regeln => aendern(K, `ACL ${name} geändert`, n => Modell.setzen(n, g.id, `acls.${name}.regeln`, regeln), {text: aclBefehl(name, Object.assign({}, a, {regeln}))});
      el.append(h("div", {class: "in-karte"},
        h("div", {class: "in-zeile zwischen"}, h("b", {}, `ACL ${name}`, h("small", {class: "in-leise"}, `  ${std ? "Standard" : "erweitert"}`)),
          knopf("ACL löschen", () => aendern(K, `ACL ${name} gelöscht`, n => {
            Modell.loeschen(n, g.id, `acls.${name}`);
            for (const [p, i] of Object.entries(n.geraete[g.id].running.if)) { if (i.aclIn === name) i.aclIn = null; if (i.aclOut === name) i.aclOut = null; }
          }, {text: /^\d+$/.test(name) ? `no access-list ${name}` : `no ip access-list ${std ? "standard" : "extended"} ${name}`}), "klein geist")),
        hinweis(b.length ? `Angewendet auf: <span class="mono">${b.join(", ")}</span>` : "Noch keiner Schnittstelle zugewiesen – sie wirkt erst mit „ip access-group“ (Reiter Schnittstellen).", b.length ? "klein" : "klein warn"),
        h("ol", {class: "in-regeln"}, a.regeln.map((r, i) => h("li", {class: r.aktion},
          h("span", {class: "mono"}, regelText(r, std)),
          h("span", {class: "in-regel-knopf"},
            knopf("↑", () => { const x = a.regeln.slice(); [x[i - 1], x[i]] = [x[i], x[i - 1]]; neu(x); }, "klein geist" + (i === 0 ? " versteckt" : ""), "nach oben"),
            knopf("↓", () => { const x = a.regeln.slice(); [x[i + 1], x[i]] = [x[i], x[i + 1]]; neu(x); }, "klein geist" + (i === a.regeln.length - 1 ? " versteckt" : ""), "nach unten"),
            knopf("✕", () => neu(a.regeln.filter((_, j) => j !== i)), "klein geist", "Regel löschen")))),
          h("li", {class: "implizit"}, h("span", {class: "mono"}, "deny any (implizit)"))),
        regelFormular(K, name, std, r => neu([...a.regeln, r]))));
    }
    el.append(abschnitt("Neue ACL", neuZeile(K, "acl", [["name", "Nummer oder Name", "10, 110 oder GAST", "text"]], w => {
      const name = w.name.trim(), nr = /^\d+$/.test(name) ? +name : null;
      let typ = nr != null ? (nr >= 1 && nr <= 99 || nr >= 1300 && nr <= 1999 ? "standard" : nr >= 100 && nr <= 199 || nr >= 2000 && nr <= 2699 ? "erweitert" : null) : "erweitert";
      if (!typ) { UI.toast?.("Nummern: 1–99 Standard, 100–199 erweitert.", "warn"); return; }
      if (acls[name]) { UI.toast?.(`ACL ${name} gibt es schon.`, "warn"); return; }
      aendern(K, `ACL ${name} angelegt`, n => Modell.setzen(n, g.id, `acls.${name}`, {typ, benannt: nr == null, regeln: []}),
        {text: nr == null ? `ip access-list extended ${name}` : `! access-list ${name} entsteht mit der ersten Regel`});
    }, "Anlegen"), hinweis("Nummer 1–99 = Standard-ACL (nur Absender), 100–199 oder ein Name = erweiterte ACL (Absender, Ziel, Protokoll, Port).", "klein")));
  }
  function regelFormular(K, name, std, onAdd){
    const aktion = h("select", {class: "in-auswahl", "aria-label": "Aktion"}, h("option", {value: "permit"}, "permit"), h("option", {value: "deny"}, "deny"));
    const proto = h("select", {class: "in-auswahl", "aria-label": "Protokoll"}, ["ip", "tcp", "udp", "icmp"].map(p => h("option", {value: p}, p)));
    const quelle = h("input", {type: "text", class: "in-eingabe mono", placeholder: "Quelle: any / host … / 192.168.1.0/24", "data-key": `neu.acl.${name}.q`});
    const ziel = h("input", {type: "text", class: "in-eingabe mono", placeholder: "Ziel: any / host … / Netz", "data-key": `neu.acl.${name}.z`});
    const port = h("input", {type: "text", class: "in-eingabe mono", placeholder: "Port (eq 80)", "data-key": `neu.acl.${name}.p`});
    const meldung = h("div", {class: "in-meldung bad", hidden: true});
    function los(){
      const q = adrLesen(quelle.value), z = std ? null : adrLesen(ziel.value);
      if (!q) return fehler("Quelle: „any“, „host 1.2.3.4“, „192.168.1.0/24“ oder „192.168.1.0 0.0.0.255“.");
      if (!std && !z) return fehler("Ziel: „any“, „host 1.2.3.4“, „10.0.0.0/8“ oder „10.0.0.0 0.255.255.255“.");
      let zielPort = null;
      const pt = port.value.trim();
      if (pt && !std) {
        if (!["tcp", "udp"].includes(proto.value)) return fehler("Ports gibt es nur bei tcp oder udp.");
        const m = /^(?:(eq|neq|gt|lt)\s+)?(\d{1,5})$/.exec(pt) || null, rg = /^range\s+(\d{1,5})\s+(\d{1,5})$/.exec(pt);
        if (m) zielPort = {op: m[1] || "eq", ports: [+m[2]]}; else if (rg) zielPort = {op: "range", ports: [+rg[1], +rg[2]]}; else return fehler("Port als „eq 80“, „gt 1023“ oder „range 20 21“.");
      }
      onAdd({aktion: aktion.value, proto: std ? "ip" : proto.value, quelle: q, ziel: z, zielPort, quellPort: null, icmpTyp: null});
    }
    function fehler(t){ meldung.hidden = false; meldung.textContent = t; }
    for (const i of [quelle, ziel, port]) i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); los(); } });
    return h("div", {class: "in-regel-neu"}, h("div", {class: "in-zeile"}, aktion, std ? null : proto), quelle, std ? null : ziel, std ? null : port,
      h("div", {class: "in-zeile"}, knopf("Regel anhängen", los, "klein")), meldung);
  }

  /* ---------- Router: NAT und DHCP ---------- */
  function dienstRouter(K, g, el){
    const k = g.running, nat = k.nat || {statisch: [], dynamisch: []};
    const inside = Object.entries(k.if).filter(([, i]) => i.nat === "inside").map(([p]) => p), outside = Object.entries(k.if).filter(([, i]) => i.nat === "outside").map(([p]) => p);
    const natNeu = (n2, text) => aendern(K, "NAT geändert", n => Modell.setzen(n, g.id, "nat", n2), {text});
    el.append(abschnitt("NAT / PAT",
      hinweis(`inside: <span class="mono">${inside.join(", ") || "—"}</span> · outside: <span class="mono">${outside.join(", ") || "—"}</span> (einstellen im Reiter Schnittstellen)`, inside.length && outside.length ? "klein" : "klein warn"),
      h("h5", {}, "PAT (viele private Adressen teilen sich eine öffentliche)"),
      ...(nat.dynamisch || []).map((d, i) => h("div", {class: "in-zeile zwischen in-listenzeile"}, h("span", {class: "mono"}, `list ${d.acl} → ${d.aus}${d.overload ? " overload" : ""}`),
        knopf("✕", () => natNeu(Object.assign({}, nat, {dynamisch: nat.dynamisch.filter((_, j) => j !== i)}), `no ip nat inside source list ${d.acl} interface ${d.aus} overload`), "klein geist"))),
      neuPat(K, g, nat, natNeu),
      h("h5", {}, "Statisches NAT (feste Zuordnung, z. B. für einen Server)"),
      ...(nat.statisch || []).map((s, i) => h("div", {class: "in-zeile zwischen in-listenzeile"},
        h("span", {class: "mono"}, s.proto ? `${s.proto} ${s.innen}:${s.innenPort} ↔ ${s.aussen}:${s.aussenPort}` : `${s.innen} ↔ ${s.aussen}`),
        knopf("✕", () => natNeu(Object.assign({}, nat, {statisch: nat.statisch.filter((_, j) => j !== i)}), `no ip nat inside source static ${s.innen} ${s.aussen}`), "klein geist"))),
      neuZeile(K, "natstat", [["innen", "Innen (privat)", "192.168.1.10", "ip"], ["aussen", "Außen (öffentlich)", "203.0.113.10", "ip"]],
        w => natNeu(Object.assign({}, nat, {statisch: [...(nat.statisch || []), {innen: w.innen, aussen: w.aussen, proto: null, innenPort: null, aussenPort: null}]}), `ip nat inside source static ${w.innen} ${w.aussen}`), "Anlegen")));
    const dh = k.dhcp || {ausgeschlossen: [], pools: []};
    el.append(abschnitt("DHCP-Server",
      h("h5", {}, "Ausgeschlossene Adressen (excluded-address)"),
      ...(dh.ausgeschlossen || []).map((a, i) => h("div", {class: "in-zeile zwischen in-listenzeile"}, h("span", {class: "mono"}, `${a.von} – ${a.bis || a.von}`),
        knopf("✕", () => aendern(K, "Ausschluss gelöscht", n => Modell.setzen(n, g.id, "dhcp.ausgeschlossen", dh.ausgeschlossen.filter((_, j) => j !== i)), {text: `no ip dhcp excluded-address ${a.von} ${a.bis || ""}`}), "klein geist"))),
      neuZeile(K, "dhcpaus", [["von", "Von", "192.168.10.1", "ip"], ["bis", "Bis", "192.168.10.9", "ip"]],
        w => aendern(K, "Adressen ausgeschlossen", n => Modell.setzen(n, g.id, "dhcp.ausgeschlossen", [...(dh.ausgeschlossen || []), {von: w.von, bis: w.bis}]), {text: `ip dhcp excluded-address ${w.von} ${w.bis}`}), "Ausschließen"),
      h("h5", {}, "Pools"),
      ...(dh.pools || []).map((p, i) => poolKarte(K, "dhcp.pools", dh.pools, i, false)),
      knopf("+ Pool anlegen", () => aendern(K, "DHCP-Pool angelegt", n => Modell.setzen(n, g.id, "dhcp.pools", [...(dh.pools || []), {name: "LAN" + ((dh.pools || []).length + 1), netz: "", maske: "255.255.255.0", gw: "", dns: ""}]),
        {text: `ip dhcp pool LAN${(dh.pools || []).length + 1}`}), "klein"),
      hinweis("Clients in einem anderen Netz erreichen den DHCP-Server nur über ein Relay: <code>ip helper-address</code> auf der Schnittstelle zu ihnen.", "klein")));
  }
  function neuPat(K, g, nat, natNeu){
    const acls = Object.keys(g.running.acls || {});
    const aclSel = h("select", {class: "in-auswahl", "aria-label": "ACL"}, acls.length ? acls.map(a => h("option", {value: a}, "ACL " + a)) : h("option", {value: ""}, "erst eine ACL anlegen"));
    const ausSel = h("select", {class: "in-auswahl", "aria-label": "Ausgang"}, Object.keys(g.running.if).map(p => h("option", {value: p, selected: g.running.if[p].nat === "outside"}, p)));
    return h("div", {class: "in-zeile in-neu"}, aclSel, h("span", {}, "→"), ausSel,
      knopf("PAT anlegen", () => {
        if (!aclSel.value) { UI.toast?.("PAT braucht eine ACL, die die inneren Adressen beschreibt (Reiter ACL).", "warn"); return; }
        natNeu(Object.assign({}, nat, {dynamisch: [...(nat.dynamisch || []), {acl: aclSel.value, aus: ausSel.value, overload: true}]}),
          `ip nat inside source list ${aclSel.value} interface ${ausSel.value} overload`);
      }, "klein"));
  }

  /* ---------- Firewall ---------- */
  function regeln(K, g, el){
    const r = g.running.regeln || [];
    const neu = (liste, text) => aendern(K, "Firewall-Regeln geändert", n => Modell.setzen(n, g.id, "regeln", liste), text ? {text} : null);
    const zonen = [["innen", "innen"], ["aussen", "außen"], ["dmz", "DMZ"]];
    el.append(hinweis("Von oben nach unten, die erste passende Regel gilt. Was keine Regel erlaubt, wird verworfen. Antworten auf erlaubte Verbindungen kommen automatisch zurück (zustandsbehaftet).", "klein"),
      h("ol", {class: "in-regeln fw"}, r.map((x, i) => h("li", {class: (x.aktion === "erlauben" ? "permit" : "deny") + (x.aktiv === false ? " inaktiv" : "")},
        h("span", {}, h("b", {}, x.aktion === "erlauben" ? "✓ " : "✕ "), `${x.von} → ${x.nach} · ${x.proto}${x.port ? "/" + x.port : ""}`, h("small", {class: "mono in-leise"}, ` ${x.quelle} → ${x.ziel}`)),
        h("span", {class: "in-regel-knopf"},
          h("input", {type: "checkbox", checked: x.aktiv !== false, title: "Regel aktiv", onchange: e => neu(r.map((y, j) => j === i ? Object.assign({}, y, {aktiv: e.target.checked}) : y))}),
          knopf("↑", () => { const l = r.slice(); [l[i - 1], l[i]] = [l[i], l[i - 1]]; neu(l); }, "klein geist" + (i === 0 ? " versteckt" : "")),
          knopf("↓", () => { const l = r.slice(); [l[i + 1], l[i]] = [l[i], l[i + 1]]; neu(l); }, "klein geist" + (i === r.length - 1 ? " versteckt" : "")),
          knopf("✕", () => neu(r.filter((_, j) => j !== i)), "klein geist")))),
        h("li", {class: "implizit"}, h("span", {}, "alles andere: verwerfen (implizit)"))));
    const von = h("select", {class: "in-auswahl", "aria-label": "von"}, zonen.map(([w, t]) => h("option", {value: w}, t)));
    const nach = h("select", {class: "in-auswahl", "aria-label": "nach"}, zonen.map(([w, t]) => h("option", {value: w, selected: w === "aussen"}, t)));
    const proto = h("select", {class: "in-auswahl", "aria-label": "Protokoll"}, ["ip", "tcp", "udp", "icmp"].map(p => h("option", {value: p}, p)));
    const aktion = h("select", {class: "in-auswahl", "aria-label": "Aktion"}, h("option", {value: "erlauben"}, "erlauben"), h("option", {value: "verwerfen"}, "verwerfen"));
    const quelle = h("input", {type: "text", class: "in-eingabe mono", placeholder: "Quelle: any oder 192.168.1.0/24"});
    const ziel = h("input", {type: "text", class: "in-eingabe mono", placeholder: "Ziel: any oder 172.16.0.10/32"});
    const port = h("input", {type: "text", class: "in-eingabe mono", placeholder: "Port (443)"});
    const meldung = h("div", {class: "in-meldung bad", hidden: true});
    const cidrOk = t => !t || t === "any" || !!IP.ausCidr(t) || IP.gueltig(t);
    el.append(abschnitt("Regel hinzufügen", h("div", {class: "in-regel-neu"},
      h("div", {class: "in-zeile"}, von, h("span", {}, "→"), nach, proto, aktion), quelle, ziel, port,
      knopf("Regel anhängen", () => {
        const q = quelle.value.trim().toLowerCase() || "any", z = ziel.value.trim().toLowerCase() || "any", p = port.value.trim();
        if (!cidrOk(q) || !cidrOk(z)) { meldung.hidden = false; meldung.textContent = "Quelle und Ziel: „any“, eine Adresse oder ein Netz wie 192.168.1.0/24."; return; }
        if (p && (!/^\d{1,5}$/.test(p) || !["tcp", "udp"].includes(proto.value))) { meldung.hidden = false; meldung.textContent = "Ein Port nur bei tcp/udp, als Zahl."; return; }
        const norm = t => t === "any" ? "any" : IP.gueltig(t) ? t + "/32" : t;
        neu([...r, {id: "r" + (r.length + 1) + "-" + r.reduce((m, x) => m + x.id.length, 0), von: von.value, nach: nach.value, proto: proto.value, quelle: norm(q), ziel: norm(z), port: p ? +p : null, aktion: aktion.value, aktiv: true, text: ""}]);
      }, "klein"), meldung)));
  }
  function fwnat(K, g, el){
    const nat = g.running.nat || {quellNat: [], weiterleitung: []};
    const neu = (n2) => aendern(K, "Firewall-NAT geändert", n => Modell.setzen(n, g.id, "nat", n2));
    el.append(abschnitt("Quell-NAT (PAT)", hinweis("Private Absender bekommen beim Verlassen der Zone die Adresse der Firewall.", "klein"),
      ...(nat.quellNat || []).map((q, i) => h("div", {class: "in-zeile zwischen in-listenzeile"}, h("span", {}, `${q.von} → ${q.nach}`),
        knopf("✕", () => neu(Object.assign({}, nat, {quellNat: nat.quellNat.filter((_, j) => j !== i)})), "klein geist"))),
      neuZeile(K, "fwq", [["von", "Von Zone", "innen", "text"], ["nach", "Nach Zone", "aussen", "text"]],
        w => neu(Object.assign({}, nat, {quellNat: [...(nat.quellNat || []), {von: w.von.toLowerCase().replace("außen", "aussen"), nach: w.nach.toLowerCase().replace("außen", "aussen")}]})), "Anlegen")),
      abschnitt("Port-Weiterleitung", hinweis("Macht einen Dienst in der DMZ von außen erreichbar: Anfragen an einen Port der Firewall gehen an einen inneren Server.", "klein"),
        ...(nat.weiterleitung || []).map((w, i) => h("div", {class: "in-zeile zwischen in-listenzeile"}, h("span", {class: "mono"}, `${w.proto}/${w.aussenPort} → ${w.ziel}:${w.zielPort}`),
          knopf("✕", () => neu(Object.assign({}, nat, {weiterleitung: nat.weiterleitung.filter((_, j) => j !== i)})), "klein geist"))),
        neuZeile(K, "fww", [["aussenPort", "Port außen", "443", "zahl"], ["ziel", "Ziel-IP", "172.16.0.10", "ip"], ["zielPort", "Port innen", "443", "zahl"]],
          w => neu(Object.assign({}, nat, {weiterleitung: [...(nat.weiterleitung || []), {proto: "tcp", aussenPort: +w.aussenPort, ziel: w.ziel, zielPort: +w.zielPort}]})), "Anlegen")));
  }

  return {zeigen, leeren, reiter, _intern: {adrLesen, adrText, regelText, vlanListe, pruefeWert}};
})();
