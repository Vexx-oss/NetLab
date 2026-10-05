"use strict";
/* ---------- Konsole (Konzept § 6, Architektur § 6) ----------
   UI.konsole.oeffnen(container, netz, geraetId, verlauf, {eingabe?, fokus?})
     Terminal für ein Gerät: IOS-ähnlich (Switch, Router, Firewall), Windows-artig (PC) bzw. Linux-artig (Server, NAS – je nach Betriebssystem).
     Rechnen, Parsen und Ändern macht CLI (CLI.eingabe → Modell/Verlauf = eine Quelle der Wahrheit);
     hier nur Anzeige und Bedienung: Ausgabe scrollt, Prompt aus CLI, Verlauf ↑/↓, Tab → CLI.tab,
     „?“ sofort wie IOS, Strg+C/Strg+Z, mehrzeiliges Einfügen, Rückfragen (copy run start, reload) als Dialog.
     Einstieg (Niveau E): Zeile „Vorschlag: …“ aus CLI.vorschlag zum Anklicken.
     eingabe: Befehlsblock aus dem Inspektor („In Konsole übernehmen“); Modus-Befehle werden passend ergänzt.
   UI.konsole.zuruecksetzen(netz, geraetId, text?)  Sitzung neu beginnen (nach Neustart/Strom aus aus der GUI).
   Sitzungen liegen im Speicher je Netz (WeakMap netz → Map geraetId → Sitzung), solange das Netz dasselbe ist. */
UI.konsole = (() => {
  const SITZ = new WeakMap();
  const OFFEN = new Set();               /* sichtbare Terminals (für zuruecksetzen) */
  const KZ = new WeakMap();              /* container → Terminal-Zustand */
  const MAX_BLOECKE = 800, MAX_VERLAUF = 100;

  const niveau = () => (store.get("einst", {}) || {}).niveau || "E";
  const cli = () => (typeof CLI !== "undefined" && CLI && typeof CLI.eingabe === "function") ? CLI : null;

  function sitzungHolen(netz, id, verlauf){
    let m = SITZ.get(netz); if (!m) SITZ.set(netz, m = new Map());
    let S = m.get(id);
    if (!S) m.set(id, S = {id, bloecke: [], hist: [], histPos: null, entwurf: "", sitzung: null, frage: null, verlauf: null});
    if (verlauf) S.verlauf = verlauf;
    const c = cli();
    if (c && !S.sitzung && typeof c.sitzung === "function") {
      try { S.sitzung = c.sitzung(netz, id, {verlauf: S.verlauf, einstieg: niveau() === "E", tipps: {E: "alle", AP1: "fehler", AP2: "keine"}[niveau()] || "alle"}); S.fehler = null; }
      catch (e) { console.error("CLI.sitzung", e); S.fehler = String(e && e.message || e); }
    }
    return S;
  }

  function promptText(K){
    const S = K.S;
    if (S.frage != null) return S.frage;
    const c = cli();
    if (c && S.sitzung && typeof c.prompt === "function") { try { return c.prompt(S.sitzung); } catch (e) { console.error(e); } }
    const g = K.netz.geraete[K.id];
    return K.host ? "C:\\>" : `${g ? g.name : "Gerät"}>`;
  }

  /* ---------- Aufbau ---------- */
  function oeffnen(container, netz, id, verlauf, opt = {}){
    if (!container || !netz) return;
    const g = netz.geraete[id];
    let K = KZ.get(container);
    if (!K) { K = {container}; KZ.set(container, K); }
    K.netz = netz; K.id = id; K.host = !!(g && Modell.HOST[g.typ]); K.linux = !!(g && Modell.osVon(g) === "linux");
    container.classList.add("ko-huelle");
    container.classList.toggle("ko-host", K.host);   /* Eingabeaufforderung bricht lange Zeilen um wie Windows */
    container.replaceChildren();
    if (!g) { container.append(h("p", {class: "ko-leer"}, "Dieses Gerät gibt es nicht mehr.")); return; }
    K.S = sitzungHolen(netz, id, verlauf || UI.labor?.verlauf || null);

    K.ausgabeEl = h("div", {class: "ko-ausgabe"});
    K.promptEl = h("span", {class: "ko-prompt"});
    K.eingabeEl = h("textarea", {class: "ko-eingabe", rows: "1", spellcheck: "false", autocomplete: "off", autocapitalize: "off",
      "aria-label": K.linux ? "Befehl für das Terminal" : K.host ? "Befehl für die Eingabeaufforderung" : "IOS-Befehl eingeben", wrap: "off"});
    K.notizEl = h("div", {class: "ko-notiz", hidden: true});
    K.schirmEl = h("div", {class: "ko-schirm", role: "log", "aria-label": `Konsole ${g.name}`, tabindex: "-1"},
      K.ausgabeEl, K.notizEl, h("div", {class: "ko-zeile"}, K.promptEl, K.eingabeEl));
    K.vorschlagEl = h("div", {class: "ko-vorschlag", hidden: true});
    const hilfe = K.host
      ? [h("kbd", {}, "↑"), h("kbd", {}, "↓"), " Verlauf · ", h("kbd", {}, "Tab"), " ergänzt",
         h("span", {class: "ko-hilfe-bsp"}, " · z. B. ", h("code", {}, K.linux ? "ip a" : "ipconfig"), ", ", h("code", {}, K.linux ? "ping -c 4 192.168.1.1" : "ping 192.168.1.1"))]
      : [h("kbd", {}, "?"), " zeigt Möglichkeiten · ", h("kbd", {}, "Tab"), " ergänzt · ", h("kbd", {}, "↑"), h("kbd", {}, "↓"), " Verlauf · ", h("kbd", {}, "Strg"), "+", h("kbd", {}, "Z"), " verlässt die Konfiguration"];
    const kopf = h("div", {class: "ko-kopf"},
      h("span", {class: "ko-titel"}, K.linux ? `Terminal · ${g.name}` : K.host ? `Eingabeaufforderung · ${g.name}` : `Konsole · ${g.name}`, h("span", {class: "ko-art"}, K.linux ? "Linux-artig (bash)" : K.host ? "Windows-artig" : "IOS-ähnlich")),
      h("button", {type: "button", class: "ko-knopf", title: "Bildschirm leeren (Verlauf bleibt)", onclick: () => { K.S.bloecke = []; K.ausgabeEl.replaceChildren(); K.eingabeEl.focus(); }}, "Leeren"));
    container.append(kopf, K.schirmEl, K.vorschlagEl, h("div", {class: "ko-hilfe"}, hilfe));

    for (const b of K.S.bloecke) K.ausgabeEl.append(blockEl(b));
    if (!K.S.bloecke.length) begruessung(K, g);

    K.eingabeEl.value = K.S.entwurf || "";
    K.eingabeEl.addEventListener("keydown", e => taste(K, e));
    K.eingabeEl.addEventListener("input", () => { K.S.entwurf = K.eingabeEl.value; K.S.histPos = null; groesse(K); });
    K.eingabeEl.addEventListener("paste", e => einfuegen(K, e));
    K.schirmEl.addEventListener("mouseup", () => {
      const s = window.getSelection && window.getSelection();
      if ((!s || s.isCollapsed) && !K.eingabeEl.disabled) K.eingabeEl.focus({preventScroll: true});
    });

    if (!K.abmelden) K.abmelden = Bus.an("netz-geaendert", () => {
      if (!container.isConnected) { K.abmelden?.(); K.abmelden = null; OFFEN.delete(K); return; }
      zustand(K);
    });
    OFFEN.add(K);
    zustand(K);
    if (opt.eingabe) {
      const block = blockVorbereiten(K, String(opt.eingabe));
      K.eingabeEl.value = K.S.entwurf = block;
      K.notizEl.hidden = false;
      K.notizEl.replaceChildren(h("span", {class: "ko-sym", "aria-hidden": "true"}, "↳"),
        (opt.notiz || "Aus dem Inspektor übernommen.") + " ", h("kbd", {}, "Enter"), " führt alle Zeilen aus, ", h("kbd", {}, "Esc"), " verwirft.");
    }
    groesse(K); vorschlag(K); runter(K);
    if (opt.fokus !== false && !K.eingabeEl.disabled) setTimeout(() => { if (K.eingabeEl.isConnected) { K.eingabeEl.focus({preventScroll: true}); const n = K.eingabeEl.value.length; K.eingabeEl.setSelectionRange(n, n); } }, 0);
  }

  function begruessung(K, g){
    if (!cli()) { block(K, "info", "Die Konsole ist in dieser Fassung noch nicht verfügbar."); return; }
    if (K.S.fehler) { block(K, "fehler", "% Die Sitzung ließ sich nicht starten: " + K.S.fehler); return; }
    if (K.host && UI.labor?.fern === K.id) return;          /* Fernwartung: das Sitzungsfenster links sagt schon, wo man ist */
    block(K, "info", K.host
      ? `${K.linux ? "Terminal" : "Eingabeaufforderung"} von ${g.name}.`        /* Beispielbefehle stehen in der Hilfezeile darunter, im Einstieg zusätzlich als Vorschlag */
      : `Konsolenkabel an ${g.name} angeschlossen. Drücke Enter oder tippe einen Befehl.${niveau() === "E" ? " Mit „?“ siehst du jederzeit, was geht." : ""}`);
  }

  /* Gerät an/aus, Prompt (z. B. nach hostname aus der GUI) */
  function zustand(K){
    const g = K.netz.geraete[K.id];
    const aus = !g || !g.an;
    K.eingabeEl.disabled = aus;
    K.container.classList.toggle("ist-aus", aus);
    K.promptEl.textContent = aus ? "" : promptText(K);
    if (aus && !K.ausHinweis) { K.ausHinweis = true; block(K, "info", g ? "Das Gerät ist ausgeschaltet. Schalte es im Inspektor ein (Übersicht)." : "Das Gerät gibt es nicht mehr."); }
    if (!aus) K.ausHinweis = false;
  }

  /* ---------- Ausgabe ---------- */
  function blockEl(b){
    if (b.art === "echo") return h("div", {class: "ko-echo"}, h("span", {class: "ko-echo-prompt"}, b.prompt), b.text);
    if (b.art === "pakete") return h("div", {class: "ko-pakete"}, h("button", {type: "button", class: "ko-pakete-knopf", title: "Die Aufzeichnung dieses Befehls in der Simulation ansehen",
      onclick: () => { UI.labor.zeigeTrace?.(b.trace, {quelle: "terminal", abspielen: false}); UI.labor.dock?.("sim"); }}, "Pakete ansehen ▸"));
    const el = h("pre", {class: "ko-block " + b.art});
    let vorherZeile = false;
    for (const [i, z] of b.text.split("\n").entries()) {
      /* „   IPv4-Adresse  . . . . . . : 192.168.1.10“: eigene Zeile, deren Punkte im schmalen Terminal schrumpfen (Design § 20) */
      const p = b.art === "aus" && PUNKTE.exec(z);
      if (p) { el.append(h("span", {class: "ko-pz"}, h("span", {class: "ko-pz-name"}, p[1]), h("span", {class: "ko-pz-punkte", "aria-hidden": "true"}, p[2]), h("span", {class: "ko-pz-wert"}, p[3]))); vorherZeile = true; continue; }
      if (i && !vorherZeile) el.append("\n");
      vorherZeile = false;
      /* %SYS-5-CONFIG_I: … ist eine Protokollmeldung, kein Fehler – eigene, ruhigere Farbe */
      el.append(/^\s*%[A-Z0-9_]+-\d-[A-Z0-9_]+:/.test(z) ? h("span", {class: "ko-syslog"}, z) : /^\s*%/.test(z) ? h("span", {class: "ko-fehlerzeile"}, z) : z);
    }
    return el;
  }
  const PUNKTE = /^(\s*[^.:\s][^.:]*?\s?)((?:\. ?){2,})(:.*)$/;
  function block(K, art, text, prompt){
    const b = art === "echo" ? {art, text, prompt} : art === "pakete" ? {art, trace: text} : {art, text: String(text).replace(/\n$/, "")};
    K.S.bloecke.push(b);
    if (K.S.bloecke.length > MAX_BLOECKE) { K.S.bloecke.splice(0, K.S.bloecke.length - MAX_BLOECKE); K.ausgabeEl.firstChild?.remove(); }
    K.ausgabeEl.append(blockEl(b));
  }
  const runter = K => { K.schirmEl.scrollTop = K.schirmEl.scrollHeight; };
  function groesse(K){
    const n = Math.min(10, (K.eingabeEl.value.match(/\n/g) || []).length + 1);
    K.eingabeEl.rows = n;
  }

  /* ---------- Ausführen ---------- */
  function ausfuehren(K, zeile){
    const c = cli(), S = K.S;
    block(K, "echo", zeile, promptText(K));
    if (!c) { block(K, "info", "Die Konsole ist in dieser Fassung noch nicht verfügbar."); return; }
    if (!S.sitzung) { sitzungHolen(K.netz, K.id, S.verlauf); if (!S.sitzung) { block(K, "fehler", "% Keine Sitzung: " + (S.fehler || "unbekannter Fehler")); return; } }
    if (zeile.trim() && S.frage == null && S.hist[S.hist.length - 1] !== zeile) { S.hist.push(zeile); if (S.hist.length > MAX_VERLAUF) S.hist.shift(); }
    S.histPos = null;
    let r;
    try { r = c.eingabe(S.sitzung, zeile); }
    catch (e) { console.error("CLI.eingabe", e); block(K, "fehler", "% Interner Fehler der Konsole: " + (e && e.message || e)); S.frage = null; return; }
    S.frage = null;
    let aus = r && r.ausgabe != null ? String(r.ausgabe) : "";
    /* Rückfrage (z. B. „Destination filename [startup-config]?“): kein Prompt, letzte Zeile ohne Zeilenende */
    if (r && !r.prompt && aus && !/\n$/.test(aus)) {
      const i = aus.lastIndexOf("\n");
      S.frage = aus.slice(i + 1); aus = aus.slice(0, i + 1);
    }
    if (aus.replace(/\n+$/, "")) block(K, "aus", aus);
    /* Phase C: Paket auf der Fläche abspielen (die Simulation frischt sich nur auf), Link zur Aufzeichnung, Beweis für die Akte */
    if (r && r.trace && UI.labor.netz === K.netz) { try { UI.labor.zeigeTrace(r.trace, {quelle: "terminal", wechseln: false}); } catch (e) { console.error(e); } block(K, "pakete", r.trace); }
    if (r && zeile.trim()) Bus.senden("befehl", {netz: K.netz, id: K.id, befehl: zeile.trim(), ergebnis: r});
  }
  function ausfuehrenAlles(K, text){
    const zeilen = String(text).replace(/\r/g, "").split("\n");
    if (zeilen.length > 1 && zeilen[zeilen.length - 1] === "") zeilen.pop();
    for (const z of zeilen) ausfuehren(K, z);
    K.eingabeEl.value = K.S.entwurf = "";
    K.notizEl.hidden = true;
    groesse(K); zustand(K); vorschlag(K); runter(K);
  }

  function taste(K, e){
    const el = K.eingabeEl, wert = el.value, S = K.S;
    const strg = e.ctrlKey || e.metaKey;
    if (!(strg && (e.key === "k" || e.key === "K"))) e.stopPropagation();     /* Tasten gehören dem Terminal, nicht dem Editor */
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ausfuehrenAlles(K, wert); return; }
    if (e.key === "ArrowUp" && !wert.slice(0, el.selectionStart).includes("\n")) { e.preventDefault(); blaettern(K, -1); return; }
    if (e.key === "ArrowDown" && !wert.slice(el.selectionEnd).includes("\n")) { e.preventDefault(); blaettern(K, +1); return; }
    if (e.key === "Tab" && !e.shiftKey && wert.trim() && S.frage == null) { e.preventDefault(); ergaenzen(K); return; }
    if (e.key === "?" && !K.host && S.frage == null && !strg) { e.preventDefault(); fragezeichen(K); return; }
    if (strg && (e.key === "c" || e.key === "C") && !e.shiftKey) {
      if (el.selectionStart !== el.selectionEnd) return;                  /* markierten Text kopieren lassen */
      e.preventDefault(); abbrechen(K, "^C"); return;
    }
    if (strg && (e.key === "z" || e.key === "Z") && !K.host && !e.shiftKey) { e.preventDefault(); abbrechen(K, "^Z"); return; }
    if (e.key === "Escape") {
      e.preventDefault();
      if (wert) { el.value = S.entwurf = ""; K.notizEl.hidden = true; groesse(K); }
      else K.schirmEl.focus();
    }
  }
  function blaettern(K, d){
    const S = K.S; if (!S.hist.length) return;
    if (S.histPos == null) { if (d > 0) return; S.entwurfVorVerlauf = K.eingabeEl.value; S.histPos = S.hist.length; }
    S.histPos += d;
    if (S.histPos < 0) S.histPos = 0;
    if (S.histPos >= S.hist.length) { S.histPos = null; K.eingabeEl.value = S.entwurfVorVerlauf || ""; }
    else K.eingabeEl.value = S.hist[S.histPos];
    S.entwurf = K.eingabeEl.value; groesse(K);
    const n = K.eingabeEl.value.length; K.eingabeEl.setSelectionRange(n, n);
  }
  function ergaenzen(K){
    const c = cli(); if (!c || typeof c.tab !== "function" || !K.S.sitzung) return;
    const zeile = K.eingabeEl.value;
    let r; try { r = c.tab(K.S.sitzung, zeile); } catch (e) { console.error(e); return; }
    if (!r) return;
    if (r.zeile != null && r.zeile !== zeile) { K.eingabeEl.value = K.S.entwurf = r.zeile; }
    else if (r.vorschlaege && r.vorschlaege.length > 1) {
      block(K, "echo", zeile, promptText(K));
      block(K, "aus", r.vorschlaege.join("  "));
      runter(K);
    }
    const n = K.eingabeEl.value.length; K.eingabeEl.setSelectionRange(n, n);
  }
  function fragezeichen(K){
    const c = cli(), zeile = K.eingabeEl.value;
    block(K, "echo", zeile + "?", promptText(K));
    if (!c || !K.S.sitzung) { block(K, "info", "Die Konsole ist in dieser Fassung noch nicht verfügbar."); runter(K); return; }
    let r; try { r = c.eingabe(K.S.sitzung, zeile + "?"); } catch (e) { console.error(e); block(K, "fehler", "% Interner Fehler: " + (e && e.message || e)); return; }
    if (r && r.ausgabe) block(K, "aus", r.ausgabe);
    zustand(K); runter(K);                                                 /* Zeile bleibt stehen, wie bei IOS */
  }
  function abbrechen(K, zeichen){
    const S = K.S, zeile = K.eingabeEl.value, p = promptText(K);
    block(K, "echo", zeile + zeichen, p);
    K.eingabeEl.value = S.entwurf = ""; K.notizEl.hidden = true; groesse(K);
    if (S.frage != null) {                                                  /* Rückfrage abgebrochen – auch in der CLI-Sitzung, */
      S.frage = null;                                                       /* sonst schluckt sie die nächste Zeile als Antwort */
      try { const c = cli(); if (c && S.sitzung && typeof c.abbrechen === "function") c.abbrechen(S.sitzung); } catch (e) { console.error(e); }
    }
    else if (/\(config[^)]*\)#\s*$/.test(p) && cli() && S.sitzung) {       /* Strg+C/Strg+Z im Konfig-Modus = end */
      try { const r = cli().eingabe(S.sitzung, "end"); if (r && r.ausgabe) block(K, "aus", r.ausgabe); } catch (e) { console.error(e); }
    }
    zustand(K); vorschlag(K); runter(K);
  }
  function einfuegen(K, e){
    const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    if (!/\r?\n/.test(text)) return;
    e.preventDefault();
    const el = K.eingabeEl, vorher = el.value.slice(0, el.selectionStart), nachher = el.value.slice(el.selectionEnd);
    const zeilen = (vorher + text + nachher).replace(/\r/g, "").split("\n");
    const rest = zeilen.pop();                                              /* letzte Zeile ohne Zeilenende bleibt in der Eingabe */
    for (const z of zeilen) ausfuehren(K, z);
    el.value = K.S.entwurf = rest; K.notizEl.hidden = true;
    groesse(K); zustand(K); vorschlag(K); runter(K);
  }

  /* Befehlsblock aus dem Inspektor: nötige Moduswechsel davor, „end“ danach (IOS) */
  function blockVorbereiten(K, code){
    code = code.replace(/\s+$/, "");
    if (K.host) return code;
    const p = promptText(K);
    const konfig = /\(config[^)]*\)#\s*$/.test(p), user = />\s*$/.test(p), priv = !konfig && /#\s*$/.test(p);
    const exec = /^(copy|write|wr|reload|clear|show|sh|ping|traceroute|delete|erase|enable|configure|conf)\b/i.test(code.trim());
    if (exec) return (konfig ? "end\n" : user ? "enable\n" : "") + code;
    return (user ? "enable\nconfigure terminal\n" : priv ? "configure terminal\n" : "") + code + "\nend";
  }

  function vorschlag(K){
    const c = cli(), el = K.vorschlagEl;
    el.hidden = true; el.replaceChildren(); K.container.classList.remove("ko-mit-vorschlag");
    if (niveau() !== "E" || !c || typeof c.vorschlag !== "function" || !K.S.sitzung || K.eingabeEl.disabled) return;
    let v; try { v = c.vorschlag(K.S.sitzung); } catch (e) { console.error(e); return; }
    if (!v) return;
    const befehl = typeof v === "string" ? v : v.befehl, text = typeof v === "string" ? null : (v.text || v.erklaerung);
    if (!befehl) return;
    el.hidden = false; K.container.classList.add("ko-mit-vorschlag");     /* Beispiele unten wären doppelt */
    el.append(h("span", {class: "ko-vorschlag-titel"}, "Vorschlag:"),
      h("button", {type: "button", class: "ko-vorschlag-knopf", title: "In die Eingabe übernehmen – Enter führt ihn aus",
        onclick: () => { K.eingabeEl.value = K.S.entwurf = befehl; groesse(K); K.eingabeEl.focus(); const n = befehl.length; K.eingabeEl.setSelectionRange(n, n); }},
        h("code", {}, befehl)),
      text ? h("span", {class: "ko-vorschlag-text"}, text) : null);
  }

  function zuruecksetzen(netz, id, text){
    const S = SITZ.get(netz)?.get(id); if (!S) return;
    S.sitzung = null; S.frage = null; S.histPos = null;
    const nachricht = text || "— Sitzung neu gestartet —";
    S.bloecke.push({art: "info", text: nachricht});
    for (const K of OFFEN) if (K.netz === netz && K.id === id && K.container.isConnected) {
      K.ausgabeEl.append(blockEl({art: "info", text: nachricht}));
      sitzungHolen(netz, id, S.verlauf);
      zustand(K); vorschlag(K); runter(K);
    }
  }

  return {oeffnen, zuruecksetzen};
})();
