"use strict";
/* ---------- Befehlspalette (Strg+K) ----------
   UI.palette.oeffnen(text?)   UI.palette.schliessen()
   UI.palette.befehl({name, text, aktion, stichworte?, gruppe?, taste?})   erweitert die Palette (name = eindeutiger Schlüssel)
   Eingebaut: Gerät springen, „ping A B“ (B = Gerät, IP oder Name), Ebene, Ansicht, Werkzeuge, Rückgängig, Einstellungen … */
UI.palette = (() => {
  const eigene = new Map();
  let offen = null;

  function befehl(b){ if (b && (b.name || b.text)) eigene.set(b.name || b.text, b); }

  /* Gerät per Name, ID oder IP finden (ohne Groß/klein, Präfix erlaubt) */
  function finden(netz, wort){
    if (!netz || !wort) return null;
    const w = wort.toLowerCase(), alle = Object.values(netz.geraete);
    return alle.find(g => g.id.toLowerCase() === w || g.name.toLowerCase() === w)
      || alle.find(g => UI.ebenen.alleAdressen(netz, g).some(a => a.ip === wort))
      || alle.find(g => g.name.toLowerCase().startsWith(w))
      || alle.find(g => g.name.toLowerCase().includes(w)) || null;
  }
  function pingEintrag(eingabe){
    const m = /^\s*ping\s+(\S+)(?:\s+(\S+))?\s*$/i.exec(eingabe);
    const netz = UI.labor?.netz;
    if (!m || !netz) return null;
    const A = finden(netz, m[1]);
    if (!A) return {gruppe: "Ping", text: `ping ${m[1]} …`, info: "Quelle unbekannt", aus: true};
    if (!m[2]) return {gruppe: "Ping", text: `ping ${A.name} …`, info: "Ziel eingeben: Gerät, IP oder Name", aus: true};
    const B = IP.gueltig(m[2]) ? (finden(netz, m[2]) && UI.ebenen.alleAdressen(netz, finden(netz, m[2])).some(a => a.ip === m[2]) ? finden(netz, m[2]) : null) : finden(netz, m[2]);
    const ziel = B ? B.id : m[2];
    const zielText = B ? B.name : m[2];
    return {gruppe: "Ping", text: `Ping ${A.name} → ${zielText}`, info: B && IP.gueltig(m[2]) ? m[2] : "", sym: "ping", aktion: () => { UI.app?.ansicht?.("labor"); UI.labor.ping(A.id, ziel); }};
  }
  function eintraege(){
    const l = [], netz = UI.labor?.netz;
    const nachLabor = fn => () => { UI.app?.ansicht?.("labor"); fn(); };
    if (netz) for (const g of Object.values(netz.geraete).sort((a, b) => a.name.localeCompare(b.name, "de"))) {
      const a = UI.ebenen.adresse(netz, g);
      l.push({gruppe: "Gerät", text: g.name, info: `${UI.geraeteArt(g.typ, g.skin).titel}${a.ip ? " · " + a.ip : ""}`, sym: "labor",
        stichworte: `${g.id} ${a.ip || ""} ${g.typ}`, aktion: nachLabor(() => UI.labor.zentrieren(g.id))});
    }
    for (const e of UI.ebenen.LISTE) l.push({gruppe: "Ebene", text: `Ebene: ${e.name}`, info: e.text, taste: e.taste, sym: "ebenen", aktion: nachLabor(() => UI.ebenen.setzen(e.id))});
    for (const a of (UI.app?.liste?.() || [])) l.push({gruppe: "Ansicht", text: `Ansicht: ${a.titel}`, sym: a.symbol, aktion: () => UI.app.ansicht(a.name)});
    const v = UI.labor?.verlauf;
    l.push(
      {gruppe: "Labor", text: "Rückgängig", taste: "Strg+Z", sym: "zurueck", aus: !v?.kannZurueck, info: v?.kannZurueck ? v.liste[v.liste.length - 1] : "", aktion: nachLabor(() => UI.labor.rueckgaengig())},
      {gruppe: "Labor", text: "Wiederholen", taste: "Strg+Y", sym: "vor", aus: !v?.kannVor, aktion: nachLabor(() => UI.labor.wiederholen())},
      {gruppe: "Labor", text: "Alles einpassen", taste: "F", sym: "einpassen", aktion: nachLabor(() => UI.labor.einpassen())},
      {gruppe: "Labor", text: "Aufräumen (Auto-Layout)", taste: "A", sym: "aufraeumen", aktion: nachLabor(() => UI.labor.aufraeumen())},
      {gruppe: "Werkzeug", text: "Ping-Werkzeug", taste: "P", sym: "ping", stichworte: "ping werkzeug", aktion: nachLabor(() => UI.labor.werkzeug("ping"))},
      {gruppe: "Werkzeug", text: "Kabel verlegen", taste: "K", sym: "kabel", aktion: nachLabor(() => UI.labor.werkzeug("kabel"))},
      {gruppe: "Werkzeug", text: "Auswählen", taste: "V", sym: "zeiger", aktion: nachLabor(() => UI.labor.werkzeug("auswahl"))},
      {gruppe: "Labor", text: "Inspektor ein-/ausklappen", taste: "I", sym: "inspektor", aktion: nachLabor(() => UI.labor.inspektor())},
      {gruppe: "Labor", text: "Simulation ein-/ausklappen", taste: "S", sym: "sim", aktion: nachLabor(() => UI.labor.simulation())},
      {gruppe: "Programm", text: "Zur Leiste wechseln", sym: "leiste", aktion: () => UI.modus?.("leiste")},
      {gruppe: "Programm", text: "Hell/Dunkel umschalten", sym: "sonne", aktion: () => UI.app?.themaUmschalten?.()},
      {gruppe: "Programm", text: "Einstellungen", sym: "zahnrad", aktion: () => UI.app?.einstellungen?.()},
      {gruppe: "Programm", text: "Tastenkürzel", taste: "?", sym: "tastatur", aktion: () => UI.app?.hilfe?.()},
    );
    for (const b of eigene.values()) l.push({gruppe: b.gruppe || "Befehl", text: b.text || b.name, info: b.info || "", taste: b.taste, sym: b.sym, stichworte: b.stichworte, aktion: b.aktion});
    l.push({gruppe: "Tipp", text: "ping <Quelle> <Ziel>", info: "z. B. „ping kasse drucker“ oder „ping kasse 192.168.1.1“", aus: true, tipp: true});
    return l;
  }
  /* unscharfe Suche: alle Zeichen in Reihenfolge; Wortanfänge und zusammenhängende Treffer zählen mehr */
  function punkte(text, frage){
    if (!frage) return 1;
    const t = text.toLowerCase(), f = frage.toLowerCase();
    const i = t.indexOf(f);
    if (i === 0) return 100; if (i > 0) return 80 - Math.min(30, i) + (/[\s:·-]/.test(t[i - 1]) ? 10 : 0);
    let pos = 0, p = 0, folge = 0;
    for (const c of f) { if (c === " ") continue; const j = t.indexOf(c, pos); if (j < 0) return 0; folge = j === pos ? folge + 1 : 0; p += 1 + folge; pos = j + 1; }
    return p;
  }
  function filtern(eingabe){
    const pe = pingEintrag(eingabe);
    const f = eingabe.trim();
    const liste = eintraege().map(e => ({e, p: Math.max(punkte(e.text, f), punkte(e.stichworte || "", f) * .8, punkte(e.gruppe + " " + e.text, f) * .7)}))
      .filter(x => x.p > 0 && (!x.e.tipp || !f || /^p/i.test(f)))
      .sort((a, b) => b.p - a.p);
    const r = liste.map(x => x.e);
    if (pe) r.unshift(pe);
    return r.slice(0, 60);
  }

  function oeffnen(start = ""){
    if (offen) { offen.eingabe.focus(); offen.eingabe.select(); return; }
    UI.menue?.zu?.();
    const vorher = document.activeElement;
    const eingabe = h("input", {class: "pal-eingabe", type: "text", placeholder: "Gerät, Befehl oder „ping kasse drucker“ …", "aria-label": "Befehl suchen",
      autocomplete: "off", spellcheck: "false", role: "combobox", "aria-expanded": "true", "aria-controls": "pal-liste", value: start});
    const liste = h("div", {class: "pal-liste", id: "pal-liste", role: "listbox"});
    const kasten = h("div", {class: "pal-kasten", role: "dialog", "aria-label": "Befehlspalette"},
      h("div", {class: "pal-kopf"}, UI.symbol("suche", 18), eingabe, h("kbd", {}, "Esc")), liste,
      h("div", {class: "pal-fuss"}, h("span", {}, h("kbd", {}, "↑"), h("kbd", {}, "↓"), " wählen"), h("span", {}, h("kbd", {}, "Enter"), " ausführen")));
    const huelle = h("div", {class: "pal-huelle", onpointerdown: e => { if (e.target === huelle) schliessen(); }}, kasten);
    document.body.append(huelle);
    let treffer = [], idx = 0;
    const zeichnen = () => {
      treffer = filtern(eingabe.value);
      idx = Math.max(0, treffer.findIndex(t => !t.aus));
      liste.replaceChildren(...treffer.map((t, i) => h("div", {class: "pal-punkt" + (t.aus ? " aus" : "") + (t.tipp ? " tipp" : ""), role: "option", id: "pal-" + i, "data-i": i,
        onpointerdown: e => { e.preventDefault(); if (!t.aus) ausfuehren(t); }, onpointermove: () => { if (!t.aus && idx !== i) { idx = i; markieren(); } }},
        h("span", {class: "pal-sym"}, t.sym ? (t.sym.nodeType ? t.sym : UI.symbol(t.sym, 16)) : null),
        h("span", {class: "pal-text"}, t.text), t.info ? h("span", {class: "pal-info"}, t.info) : null,
        h("span", {class: "pal-gruppe"}, t.gruppe), t.taste ? h("kbd", {}, t.taste) : null)));
      if (!treffer.length) liste.append(h("div", {class: "pal-nichts"}, "Nichts gefunden. Tipp: „ping <Quelle> <Ziel>“"));
      markieren();
    };
    const markieren = () => {
      for (const el of liste.children) el.classList.toggle("an", +el.dataset.i === idx);
      const el = liste.querySelector(`[data-i="${idx}"]`);
      if (el) { el.scrollIntoView({block: "nearest"}); eingabe.setAttribute("aria-activedescendant", el.id); }
    };
    const ausfuehren = t => { schliessen(); try { t.aktion && t.aktion(); } catch (e) { console.error(e); UI.toast(`Befehl fehlgeschlagen: ${e.message || e}`, "fehler"); } };
    eingabe.addEventListener("input", zeichnen);
    eingabe.addEventListener("keydown", e => {
      const n = treffer.length;
      const wander = d => { for (let s = 0; s < n; s++) { idx = (idx + d + n) % n; if (!treffer[idx].aus) break; } markieren(); };
      if (e.key === "ArrowDown") { e.preventDefault(); if (n) wander(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (n) wander(-1); }
      else if (e.key === "Enter") { e.preventDefault(); const t = treffer[idx]; if (t && !t.aus) ausfuehren(t); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); schliessen(); }
      else if (e.key === "Tab") { e.preventDefault(); }
    });
    offen = {huelle, eingabe, vorher};
    zeichnen();
    requestAnimationFrame(() => { huelle.classList.add("da"); eingabe.focus(); eingabe.setSelectionRange(eingabe.value.length, eingabe.value.length); });
  }
  function schliessen(){
    if (!offen) return;
    const o = offen; offen = null;
    o.huelle.remove();
    if (o.vorher && o.vorher.isConnected) o.vorher.focus?.({preventScroll: true});
  }
  return {oeffnen, schliessen, befehl, get offen(){ return !!offen; }, finden};
})();
