"use strict";
/* ---------- Die Leiste: ruhiger Begleiter am Bildschirmrand (Runde 5, Entwurf § 2 C) ----------
   UI.leiste.aufbauen(container) / abbauen()      (UI.modus ruft das auf)
   UI.leiste.status({ampeln:[{name, farbe:"gruen"|"gelb"|"rot", zustand}], euroProStunde, ruf, offen, text, titel})
   UI.leiste.miniBereich   DOM-Element für ein Mini-Ticket (Inhalt kommt vom Spiel; bleibt über Umbauten erhalten)
   UI.leiste.miniHilfe     DOM-Element für Denkhilfe und Lernanker des Mini-Tickets (Vertrag § 5)

   KONZEPT „BEGLEITER": Die Leiste löst KEINE Aufträge. Sie begleitet den laufenden Auftrag mit
   Kontext und führt in die Vollansicht; im 320-px-Fenster wird nicht diagnostiziert.
   · Zugeklappt 300 × 56: eine ruhige Statuskapsel – links der Zieh-Griff mit Aufklapp-Pfeil, daneben
     „Stufe N · Rolle" vollständig (notfalls nur „Stufe N") über drei Werten in EINER Zeile
     (€/h · Ruf · offen), rechts „Mini"-Signal, Denkhilfe und „öffnen". Standard-Deckkraft 0,92
     (einstellbar 0,6–1 über store "einst".leiste.deckkraft), mit der Maus voll deckend.
   · Aufgeklappt 320 × 300: „Jetzt dran" (Kunde · Auftrag, nächster Schritt in einem Satz, Primär
     „Im Labor fortsetzen", Sekundär „Auftrag lesen"), „Kurzübung (freiwillig)" (die vorhandene
     Mini-Frage aus UI.karriere.miniZeichnen, aber MIT Kontextzeile aus dem aktiven Auftrag und
     Kicker „Kurzübung · <Fertigkeit>"; sie übt nebenbei und löst den Auftrag nicht) und „Lage"
     (Verträge/Serie/offene in einer stillen Zeile, dazu Postfach/Labor/ausblenden).
   · Animation: Aufklappen 320 ms cubic-bezier(.22,1,.36,1) für Höhe/Breite, Inhalt mit 8 px Versatz
     und gestaffeltem Fade (40 ms je Modul); Zuklappen blendet den Inhalt zuerst aus (160 ms), dann
     schrumpft die Karte (240 ms ab 80 ms Versatz = 320 ms). Die OS-Fenstergröße zieht beim Zuklappen
     NACH der Karten-Animation nach, beim Aufklappen VORHER (sonst schnitte das Fenster ab).
     „Bewegung aus"/reduzierte Bewegung: sofort, ohne Wartezeit.
   · Kein Fokusklau, nur Maus (tabindex -1 wie bisher), keine erfundenen Zahlen: alles aus zustand
     (UI.leiste.status), Spiel.* oder DATEN.
   Vertrag: docs/Architektur.md § 22/§ 23 · Entwurf – Runde 5 § 2 C · tests/spiel-leiste-hilfe.test.js */
UI.leiste = (() => {
  const ZU = [300, 56], AUF = [320, 300];     /* Maße bleiben Vertrag (zugeklappt/aufgeklappt) */
  /* Höhen der aufgeklappten Karte: Ruhe 300 (Vertrag), Übung geöffnet 420, nach der Antwort 460.
     Die Kurzübung startet als EINZEILIGE Einladung und wächst erst auf Klick – das nimmt der Karte
     die Überfrachtung, und im Antwort-Zustand stehen Erklärung, „Nächstes" und „Im Labor prüfen"
     vollständig da (kein abgeschnittener Satz, keine unsichtbare Aktionszeile). */
  const HOEHE = {ruhe: 300, uebung: 420, antwort: 480};
  const zustand = {ampeln: [], euroProStunde: null, ruf: null, offen: 0, text: "", titel: ""};
  let root = null, karte = null, el = {}, auf = false, zuTimer = null, aufTimer = null;
  let groesseMarke = 0, ziehTimer = null, quizTimer = null;
  let uebungOffen = false, uebungFertig = false;
  let mini = null;                 /* erst bei Bedarf anlegen (keine Aufrufe beim Laden) */
  let hilfe = null;
  let beobachter = null;           /* liest mit, wenn Baustein C ein Mini in den Bereich zeichnet */
  /* Merker der Modul-Inhalte: nur neu bauen, wenn sich die echten Werte geändert haben
     (ein Knopf unter der Maus wird also nicht bei jedem Zustandsereignis ausgetauscht). */
  const merker = {};

  /* ---------- Kleine Helfer (defensiv: die Test-Prüfstände laden diese Datei ohne App-Rahmen) ---------- */
  const sicher = (fn, rueck) => { try { return fn(); } catch (e) { return rueck; } };
  /* Zeitdauer über die EINE Quelle UI.zeit (Architektur § 16.4); ohne DOM/App-Rahmen der Rückfall. */
  const zeit = (name, rueck) => { try { const quelle = UI["zeit"]; const t = typeof quelle === "function" ? quelle(name) : NaN; return Number.isFinite(t) && t > 0 ? t : rueck; } catch (e) { return rueck; } };
  /* „Bewegung aus"/reduziert: keine Animation, keine Wartezeit (UI.bewegung kommt aus app.js). */
  const ruhig = () => { try { return typeof UI.bewegung === "function" ? UI.bewegung() !== "voll" : false; } catch (e) { return false; } };
  const alsText = x => x == null ? "" : String(x);
  const klemme0 = (x, a, b) => Math.min(b, Math.max(a, x));

  /* Nur Maus, kein Fokusklau: auch die Knöpfe, die Baustein C in die Bereiche zeichnet, nehmen
     keinen Tastaturfokus (pointerdown verhindert das Fokussieren; der Klick selbst bleibt). */
  function fokusFrei(bereich){
    if (bereich && typeof bereich.addEventListener === "function")
      bereich.addEventListener("pointerdown", e => { const t = e.target; if (t && typeof t.closest === "function" && t.closest("button")) e.preventDefault(); });
    return bereich;
  }
  /* Auch die Knöpfe, die Baustein C in den Mini-Bereich zeichnet, bekommen kein Tab-Ziel. */
  function fokusAus(bereich){
    if (!bereich || typeof bereich.querySelectorAll !== "function") return;
    for (const b of bereich.querySelectorAll("button")) if (!b.getAttribute("tabindex")) b.setAttribute("tabindex", "-1");
  }
  const miniEl = () => {
    if (!mini) { mini = fokusFrei(h("div", {class: "lk-mini", "aria-label": "Mini-Ticket", tabindex: "-1"})); miniBeobachten(); }
    return mini;
  };
  /* Eigener Bereich unter dem Ticket: der Hilfe-Knopf soll beim Scrollen nicht verschwinden (§ 5). */
  const hilfeEl = () => hilfe ||= fokusFrei(h("div", {class: "lk-mini-hilfe", "aria-label": "Denkhilfe und Lernanker"}));

  const einstLeiste = () => Object.assign({deckkraft: 0.92, ecke: "ur"}, (store.get("einst", {}) || {}).leiste);
  const FARBE = {gruen: "ok", ok: "ok", green: "ok", gelb: "warn", warn: "warn", yellow: "warn", orange: "warn", rot: "bad", bad: "bad", red: "bad"};
  function ampelSymbol(farbe){
    const f = FARBE[farbe] || "ok";
    const s = sv("svg", {viewBox: "0 0 12 12", width: 12, height: 12, class: "lk-ampel-sym f-" + f, "aria-hidden": "true"});
    if (f === "ok") s.append(sv("circle", {cx: 6, cy: 6, r: 5}));
    else if (f === "warn") s.append(sv("path", {d: "M6 1l5 9.5H1z"}));
    else s.append(sv("rect", {x: 1.5, y: 1.5, width: 9, height: 9, rx: 1}));
    return s;
  }
  const euroText = x => x == null || isNaN(x) ? "–" : Math.round(x).toLocaleString("de-DE") + " €/h";

  /* ---------- Echte Daten (alles aus Spiel oder DATEN, nichts erfunden) ---------- */
  function kundeName(id){
    if (!id) return "Kunde";
    return sicher(() => {
      const k = (typeof Spiel.kundenDaten === "function" ? Spiel.kundenDaten(id) : null)
        || (typeof DATEN !== "undefined" && DATEN.kunden ? DATEN.kunden[id] : null);
      return k && k.name ? k.name : id;
    }, String(id));
  }
  /* Das laufende Ticket hat Vorrang; sonst der nächste offene Auftrag aus Spiel.postfach() (schon sortiert). */
  function naechsterAuftrag(){
    return sicher(() => {
      if (typeof Spiel !== "object" || !Spiel || !Spiel._st) return null;
      const aktiv = typeof Spiel.aktiveInstanz === "function" ? Spiel.aktiveInstanz() : null;
      const inst = aktiv || (typeof Spiel.postfach === "function" ? Spiel.postfach()[0] : null);
      if (!inst) return null;
      const def = typeof Spiel.defVon === "function" ? Spiel.defVon(inst) : null;
      return def ? {inst, def, aktiv: !!aktiv} : null;
    }, null);
  }
  function tagStand(){
    return sicher(() => {
      if (typeof Spiel !== "object" || !Spiel || !Spiel._st || !Spiel.tag || typeof Spiel.tag.heute !== "function") return null;
      const t = Spiel.tag.heute();
      if (!t) return null;
      return {serie: +t.serie || 0, erledigt: +t.erledigtHeute || 0, ziel: +t.ziel || 0};
    }, null);
  }
  /* Stufe · Rolle vollständig (karriere.leisteStatus liefert sie als zustand.titel); fehlt der Titel,
     wird sie aus Spiel.st.stufe + Spiel.karriere.stufeDef gebaut – keine erfundene Zahl. */
  function stufeRolle(){
    const t = alsText(zustand.titel).trim();
    if (t) return t;
    return sicher(() => {
      const n = +Spiel.st.stufe;
      if (!Number.isFinite(n) || n <= 0) return "Netzwerk-Labor";
      const d = Spiel.karriere && typeof Spiel.karriere.stufeDef === "function" ? Spiel.karriere.stufeDef(n) : null;
      const rolle = d && d.name ? String(d.name) : "";
      return "Stufe " + zahlDe(n) + (rolle ? " · " + rolle : "");
    }, "Netzwerk-Labor");
  }
  /* Der kurze Rückfall, wenn Stufe · Rolle im 300-px-Fenster wirklich nicht passt (Vertrag: „Stufe 1"). */
  function kurzStufe(voll){
    const t = alsText(voll).trim();
    const erste = (t.split("·")[0] || t).trim();
    return erste.toLowerCase().startsWith("stufe") ? erste : t;
  }
  /* Ein Satz zum nächsten Schritt: vorhandene, additive Wege (Runde 4) – nie die Lösung. */
  function naechsterSatz(a){
    if (!a || !a.aktiv) return "";
    return sicher(() => {
      const inst = a.inst;
      const ort = typeof Spiel.naechsterOrt === "function" ? Spiel.naechsterOrt(inst) : null;
      if (ort && ort.text) return alsText(ort.text).trim();
      const s = typeof Spiel.naechster === "function" ? Spiel.naechster(inst) : null;
      if (s && s.text) return alsText(s.text).trim();
      const d = typeof Spiel.naechsteDiagnose === "function" ? Spiel.naechsteDiagnose(inst) : null;
      return d ? alsText(d).trim() : "";
    }, "");
  }
  /* Zieltext des Auftrags für die Kontextzeile der Kurzübung (echte Daten aus der Ticket-Definition). */
  function zielSatz(def){
    return sicher(() => {
      const z = (def && Array.isArray(def.ziele) ? def.ziele : []).find(x => x && (x.text || x.frage));
      return z ? alsText(z.text || z.frage).trim() : "";
    }, "");
  }
  function aktuellesMini(){
    return sicher(() => {
      if (typeof Spiel !== "object" || !Spiel || !Spiel.mini) return null;
      const s = typeof Spiel.mini.stand === "function" ? Spiel.mini.stand() : null;
      if (s && s.aktuell && typeof Spiel.mini.von === "function") return Spiel.mini.von(s.aktuell);
      return typeof Spiel.mini.naechstes === "function" ? Spiel.mini.naechstes() : null;
    }, null);
  }
  function skillName(skill){
    if (!skill) return "";
    return sicher(() => {
      if (Spiel.karriere && typeof Spiel.karriere.skillName === "function") return alsText(Spiel.karriere.skillName(skill));
      const s = (typeof DATEN !== "undefined" && Array.isArray(DATEN.skills) ? DATEN.skills : []).find(x => x && x.id === skill);
      return s ? alsText(s.name || skill) : alsText(skill);
    }, alsText(skill));
  }

  /* ---------- Kleine Bausteine (nur Maus, kein Fokusklau) ---------- */
  const kicker = text => h("span", {class: "lk-kicker"}, text);
  function knopf(klasse, text, titel, fn, ...kinder){
    return h("button", {type: "button", class: klasse, tabindex: "-1", title: titel || text, "aria-label": titel || text,
      onmousedown: e => e.preventDefault(), onclick: fn}, ...(kinder.length ? kinder : [text]));
  }
  /* Echter Weg in die Vollansicht; optional danach ein Aufruf (z. B. UI.spiel.oeffnen). */
  function zumVoll(name, danach){
    if (name) sicher(() => UI.app.ansicht(name), null);
    sicher(() => UI.modus("voll"), null);
    if (danach) sicher(danach, null);
  }
  /* „Im Labor fortsetzen": in die Vollansicht ans Gerät. Ist der Auftrag schon geladen, genügt der
     Wechsel; sonst wird er defensiv geöffnet (z. B. nach einem Neustart im Leistenmodus). */
  function laborFortsetzen(a){
    if (!a) { zumVoll("postfach"); return; }
    const iid = a.inst && a.inst.iid;
    zumVoll("labor", () => {
      sicher(() => UI.spiel.mappeZu(), null);
      sicher(() => {
        if (!UI.spiel || typeof UI.spiel.oeffnen !== "function") return;
        const geladen = UI.spiel.inst && UI.spiel.inst.iid;
        if (!geladen || UI.spiel.inst.iid !== iid) UI.spiel.oeffnen(iid);
      }, null);
    });
  }
  /* „Auftrag lesen": Auftragsbogen in der Vollansicht öffnen (UI.spiel.mappeAuf, W1 hält die API stabil). */
  function auftragLesen(a){
    if (!a || !a.aktiv) { zumVoll("postfach"); return; }
    zumVoll("labor", () => sicher(() => UI.spiel.mappeAuf("brief"), null));
  }

  /* ---------- Modul 1: „Jetzt dran" ---------- */
  function jetztZeichnen(){
    if (!el.jetzt) return;
    const a = naechsterAuftrag();
    /* Nur aufgeklappt wird der nächste Schritt gerechnet (Spiel.naechster misst die Ziele – das
       gehört nicht in jeden 60-s-Takt der zugeklappten Kapsel). */
    const schritt = a && a.aktiv && auf ? naechsterSatz(a) : "";
    const kunde = a ? kundeName(a.inst.kunde || a.def.kunde) : "";
    const titel = a ? alsText(a.def.titel || "Auftrag") : "";
    const schluessel = a ? [a.aktiv, a.inst.iid, a.def.id, kunde, titel, auf ? schritt : "-"].join("|") : "leer|" + auf + "|" + zustand.text;
    if (schluessel === merker.jetzt) return;
    merker.jetzt = schluessel;
    if (!a) {
      el.jetzt.replaceChildren(
        h("div", {class: "lk-modul-kopf"}, kicker("Jetzt dran")),
        h("p", {class: "lk-leer"}, zustand.text || "Kein Auftrag offen – das Postfach füllt sich, sobald ein Kunde schreibt."),
        h("div", {class: "lk-knoepfe"}, knopf("lk-knopf lk-knopf-primaer", "Zum Postfach", "Zum Postfach wechseln", () => zumVoll("postfach"))));
      return;
    }
    el.jetzt.replaceChildren(
      h("p", {class: "lk-jetzt-titel", title: kunde + " · " + titel},
        h("span", {class: "lk-jetzt-kunde"}, kunde), " · ", h("b", {}, titel)),
      h("p", {class: "lk-jetzt-schritt", title: schritt, "aria-label": "Nächster Schritt"},
        a.aktiv
          ? (schritt || "Im Labor geht es weiter – der nächste Schritt steht am Gerät.")
          : "Noch nicht geöffnet – der Auftrag beginnt im Labor."),
      h("div", {class: "lk-knoepfe"},
        knopf("lk-link", "Auftrag lesen", a.aktiv ? "Auftragsbogen im Labor öffnen" : "Zum Postfach wechseln", () => auftragLesen(a)),
        knopf("lk-knopf lk-knopf-primaer", a.aktiv ? "Im Labor fortsetzen" : "Auftrag öffnen",
          a.aktiv ? "Labor am Gerät öffnen und den Auftrag fortsetzen" : "Diesen Auftrag im Labor öffnen", () => laborFortsetzen(a))));
  }

  /* ---------- Modul 2: „Kurzübung (freiwillig)" ---------- */
  /* Die Frage selbst zeichnet UI.karriere.miniZeichnen in UI.leiste.miniBereich (bleibt seine Quelle).
     Die Leiste zeigt zuerst nur EINE Zeile: „Kurzübung · <Fertigkeit>" links, „Antworten ▸" rechts.
     Erst der Klick öffnet Kontextzeile, Frage und Antworten; die Karte wächst dafür (420 px) und
     nach der Antwort noch einmal (460 px), damit Erklärung, „Nächstes" und „Im Labor prüfen" ganz
     sichtbar sind. Nach der Antwort bleibt sie offen – sonst ginge die Erklärung verloren. */
  function uebungZeichnen(){
    if (!el.uebung) return;
    const a = naechsterAuftrag();
    const aktiv = a && a.aktiv ? a : null;
    const m = aktuellesMini();
    const fertigkeit = skillName(m && m.skill);
    const kickerText = fertigkeit ? "Kurzübung · " + fertigkeit : "Kurzübung";
    const kunde = aktiv ? kundeName(aktiv.inst.kunde || aktiv.def.kunde) : "";
    const ziel = aktiv ? zielSatz(aktiv.def) : "";
    /* Kontextzeile im 284-px-Raster: „nebenbei üben" + Kunde + Auftrag. Der vollständige Zieltext
       steht im title (für 11 px ist er länger als die Zeile; abgeschnitten würde er mitten im Satz). */
    const titelAuftrag = aktiv ? alsText(aktiv.def.titel) : "";
    const kontext = aktiv ? ["Nebenbei üben", kunde, titelAuftrag].filter(Boolean).join(" · ") : "";
    const kontextVoll = aktiv ? ["Nebenbei üben", kunde, ziel ? "Ziel: " + ziel : ""].filter(Boolean).join(" · ") : "";
    const schluessel = [kickerText, kontext, !!aktiv].join("|");
    if (schluessel !== merker.uebung){
      merker.uebung = schluessel;
      if (el.uebungKicker){ el.uebungKicker.textContent = kickerText; el.uebungKicker.title = kickerText; }
      if (el.uebungKontext){ el.uebungKontext.textContent = kontext; el.uebungKontext.title = kontextVoll || kontext; }
      if (el.uebung) el.uebung.classList.toggle("lk-leerstand", !aktiv);
    }
    schalterText();
    pruefenSignal();
  }
  /* Beschriftung des einen Schalters: öffnen, schließen – nach der Antwort verschwindet er
     (die feste Fußzeile mit „Im Labor prüfen" übernimmt). */
  function schalterText(){
    if (!el.uebungSchalter) return;
    el.uebungSchalter.textContent = uebungOffen ? "Einklappen ▾" : "Antworten ▸";
    el.uebungSchalter.title = uebungOffen ? "Kurzübung einklappen" : "Kurzübung öffnen: Frage und Antworten";
  }
  /* Öffnen: Fenster/Karte wachsen ZUERST, dann blendet der Inhalt ein (nichts wird abgeschnitten). */
  function uebungOeffnen(){
    if (!karte || uebungOffen) return;
    if (!auf) { aufklappen(); }
    uebungOffen = true;
    schalterText();
    if (el.uebung) el.uebung.classList.add("lk-offen");
    if (!auf) return;
    groesse([320, uebungFertig ? HOEHE.antwort : HOEHE.uebung]);
    karte.classList.add("uebung-offen");
    if (uebungFertig) karte.classList.add("uebung-fertig");
    /* Nach dem Aufklappen messen: passt die Frage mit allen Antworten, oder muss der Schnappschuss
       weichen? (Der MutationObserver sieht nur Inhalts-, keine Größenänderungen.) */
    setTimeout(miniVerdichten, zeit("mittel", 240));
    setTimeout(miniVerdichten, zeit("lang", 320));
  }
  /* Einklappen vor der Antwort: Karte wächst nach der Animation zurück (die Antwort bleibt offen). */
  function uebungEinklappen(){
    if (!karte || !uebungOffen || uebungFertig) return;
    uebungOffen = false;
    schalterText();
    if (el.uebung) el.uebung.classList.remove("lk-offen");
    karte.classList.remove("uebung-offen");
    if (!auf) return;
    if (ruhig()) { groesse([320, HOEHE.ruhe]); return; }
    clearTimeout(quizTimer);
    quizTimer = setTimeout(() => { if (karte && !uebungOffen && !uebungFertig) groesse([320, HOEHE.ruhe]); }, zeit("lang", 320));
  }
  /* Nach der Antwort: Erklärung + feste Aktionszeile (und karrieres „Nächstes") ganz sichtbar. */
  function pruefenSignal(){
    const fertig = !!(mini && typeof mini.querySelector === "function" && mini.querySelector(".mk-ergebnis"));
    if (fertig !== uebungFertig){
      uebungFertig = fertig;
      if (!el.uebung) return;
      el.uebung.classList.toggle("lk-fertig", fertig);
      if (fertig) {
        uebungOffen = true;
        el.uebung.classList.add("lk-offen");
        schalterText();
        if (auf && karte) { groesse([320, HOEHE.antwort]); karte.classList.add("uebung-offen"); karte.classList.add("uebung-fertig");
          setTimeout(miniVerdichten, zeit("mittel", 240)); }
      } else if (auf && karte) {
        karte.classList.remove("uebung-fertig");
        if (uebungOffen) groesse([320, HOEHE.uebung]);
      }
    }
    if (el.uebung) el.uebung.classList.toggle("lk-offen", uebungOffen);
  }

  /* ---------- Modul 3: „Lage" (Verträge/Serie/offene in einer stillen Zeile + Schnellaktionen) ---------- */
  function lageZeichnen(){
    if (!el.lage) return;
    const ampeln = Array.isArray(zustand.ampeln) ? zustand.ampeln : [];
    const offen = +zustand.offen || 0;
    const tag = tagStand();
    const fristen = ampeln.filter(a => (FARBE[String(a && a.farbe)] || "ok") !== "ok").length;
    /* Die stille Zeile: Verträge (und Fristen, wenn es welche gibt) · Serie · offene. Der grüne,
       gelbe oder rote Punkt trägt den Vertragszustand; „alle gut" wäre dasselbe doppelt gesagt.
       Für 284 px gibt es zwei Längen: mit Vertragszahl und – falls es nicht reicht – ohne sie. */
    const teile = [], kurzTeile = [];
    if (ampeln.length) {
      teile.push(ampeln.length === 1 ? "1 Vertrag" : zahlDe(ampeln.length) + " Verträge");
      if (fristen) { const f = fristen === 1 ? "1 Frist" : zahlDe(fristen) + " Fristen"; teile.push(f); kurzTeile.push(f); }
    } else teile.push("keine Verträge");
    if (tag && tag.serie > 0) { const s = "Serie " + zahlDe(tag.serie); teile.push(s); kurzTeile.push(s); }
    const offenTeil = zahlDe(offen) + " offen";
    teile.push(offenTeil); kurzTeile.push(offenTeil);
    const text = teile.join(" · "), kurz = kurzTeile.join(" · ");
    const schluessel = text + "|" + kurz + "|" + ampeln.map(a => a && a.farbe).join(",");
    if (schluessel === merker.lage) return;
    merker.lage = schluessel;
    const farben = ampeln.map(a => FARBE[String(a && a.farbe)] || "ok");
    const schlimm = farben.includes("bad") ? "rot" : farben.includes("warn") ? "gelb" : "gruen";
    if (el.lagePunkt){
      el.lagePunkt.replaceChildren(ampelSymbol(schlimm));
      el.lagePunkt.title = ampeln.length ? ampeln.map(a => (a.name || "Vertrag") + ": " + (a.zustand || "läuft")).join(" · ") : "Noch kein Wartungsvertrag";
    }
    if (el.lageText){
      el.lageText.textContent = text;
      el.lageText.title = text;
      /* Im echten DOM gemessen: reicht die volle Zeile nicht, fällt nur die Vertragszahl weg –
         der Punkt und der Titel nennen den Zustand weiterhin. */
      if (el.lageText.clientWidth > 0 && el.lageText.scrollWidth > el.lageText.clientWidth + 1) el.lageText.textContent = kurz;
    }
  }

  /* ---------- Schnellaktionen (nur echte Wege) ---------- */
  function schnellZeichnen(){
    if (!el.schnell) return;
    const offen = +zustand.offen || 0;
    const laufend = naechsterAuftrag();
    const schluessel = [offen, laufend ? laufend.inst.iid + ":" + laufend.aktiv : "leer", !!el.ausblenden].join("|");
    if (schluessel === merker.schnell) return;
    merker.schnell = schluessel;
    const postfach = knopf("lk-knopf lk-knopf-aktion", "Postfach", "Zum Postfach wechseln (offene Aufträge)", () => zumVoll("postfach"),
      UI.symbol("postfach", 14), offen > 0 ? h("span", {class: "lk-zaehler"}, zahlDe(offen)) : null);
    const labor = knopf("lk-knopf lk-knopf-aktion", "Labor", "Zurück ins Labor", () => zumVoll("labor"), UI.symbol("labor", 14));
    el.schnell.replaceChildren(...[postfach, labor, el.ausblenden].filter(Boolean));
  }

  function moduleZeichnen(){
    jetztZeichnen();
    uebungZeichnen();
    lageZeichnen();
    schnellZeichnen();
  }

  /* ---------- Aufbau ---------- */
  function aufbauen(container){
    abbauen();
    root = h("div", {class: "leiste-wurzel" + (Plattform.name === "browser" ? " im-browser" : "")});
    const drag = {"data-tauri-drag-region": ""};
    /* Zugeklappt die ruhige Statuskapsel: links der Griff (Ziehen + Auf-/Zuklappen),
       daneben Stufe · Rolle über den drei Werten, rechts Mini-Signal, Hilfe und „öffnen". */
    el.griff = h("div", {class: "lk-griff", title: "Aufklappen (Ziehen verschiebt die Leiste)", role: "button", "aria-label": "Leiste aufklappen",
      "aria-expanded": "false", onclick: () => (auf ? zuklappen() : aufklappen()), ...drag});
    el.ampeln = h("div", {class: "lk-ampeln", ...drag});
    el.euro = h("span", {class: "lk-wert lk-euro", title: "Einnahmen je Stunde aus Wartungsverträgen", ...drag});
    el.ruf = h("span", {class: "lk-wert lk-ruf", title: "Ruf bei deinen Kunden", ...drag});
    el.offen = h("span", {class: "lk-wert lk-offen", title: "Offene Tickets im Postfach", ...drag});
    el.wertes = h("div", {class: "lk-werte", ...drag}, el.euro, el.ruf, el.offen);
    /* Der Hilfe-Knopf sitzt in der STATUSZEILE, nicht im aufgeklappten Bereich: dort war er zugeklappt
       von overflow:hidden abgeschnitten und erst nach 280 ms Mausberührung erreichbar
       (Review Auffindbarkeit, Befund 5). Er klappt den vorhandenen Bereich UI.leiste.miniHilfe auf;
       Inhalt und Stufenregel bleiben bei Baustein C (UI.karriere.miniZeichnen). Nur Maus, kein Fokusklau. */
    el.hilfeKnopf = h("button", {type: "button", class: "lk-hilfe-knopf", tabindex: "-1",
      "aria-label": "Denkhilfe und Lernanker öffnen", title: "Denkhilfe und Lernanker öffnen",
      onmousedown: e => e.preventDefault(), onclick: () => hilfeOeffnen()}, UI.symbol("hilfe", 16));
    /* Wartendes Mini-Ticket sichtbar machen: zugeklappt sah der Azubi nur €/h, Ruf und offene Tickets –
       kein Zeichen, dass eine Mail auf Antwort wartet (dieselbe Review, Befund 5). */
    el.miniWartet = h("button", {type: "button", class: "lk-mini-wartet", tabindex: "-1", hidden: true,
      "aria-label": "Mini-Ticket wartet auf Antwort", title: "Ein Mini-Ticket wartet auf Antwort – hier aufklappen",
      onmousedown: e => e.preventDefault(), onclick: () => aufklappen()},
      h("span", {class: "lk-punkt"}), h("span", {}, "Mini"));
    const oeffnen = h("button", {type: "button", class: "lk-oeffnen", tabindex: "-1", title: "Vollansicht öffnen", "aria-label": "Vollansicht öffnen",
      onmousedown: e => e.preventDefault(), onclick: () => UI.modus("voll")}, UI.symbol("oeffnen", 18), h("span", {}, "öffnen"));
    const tray = Plattform.kann("tray");
    const ausblenden = tray.ja ? h("button", {type: "button", class: "lk-klein", tabindex: "-1", title: "Ins Tray ausblenden", "aria-label": "Ins Tray ausblenden", onmousedown: e => e.preventDefault(),
      onclick: () => UI.modus("tray")}, "ausblenden") : null;
    el.ausblenden = ausblenden;
    /* Die Statuszeile: Reihenfolge und Klassen sind Vertrag (tests/spiel-leiste-hilfe.test.js). */
    const zeile = h("div", {class: "lk-zeile"},
      el.griff, el.ampeln, el.wertes, el.miniWartet, el.hilfeKnopf, oeffnen);
    /* Das aufgeklappte Bento: drei Module, der Mini-Bereich bleibt der größte. */
    el.jetzt = h("section", {class: "lk-modul lk-jetzt", "aria-label": "Jetzt dran"});
    el.uebungKicker = kicker("Kurzübung");
    el.uebungSchalter = knopf("lk-link lk-link-stark", "Antworten ▸", "Kurzübung öffnen: Frage und Antworten",
      () => (uebungOffen ? uebungEinklappen() : uebungOeffnen()));
    el.uebungPruefen = knopf("lk-knopf lk-knopf-primaer", "Im Labor prüfen", "Antwort im Labor am Gerät prüfen", () => zumVoll("labor"));
    el.uebungFuss = h("div", {class: "lk-knoepfe lk-uebung-fuss"}, el.uebungPruefen);
    el.uebungKontext = h("p", {class: "lk-kontext"});
    el.uebungLeer = h("p", {class: "lk-leer"}, "Ohne laufenden Auftrag gibt es keinen Übungskontext – öffne im Labor einen Auftrag.");
    el.uebung = h("section", {class: "lk-modul lk-uebung" + (uebungOffen ? " lk-offen" : ""), "aria-label": "Kurzübung (freiwillig)"},
      h("div", {class: "lk-modul-kopf"}, el.uebungKicker, el.uebungSchalter),
      el.uebungKontext, el.uebungLeer, miniEl(), hilfeEl(), el.uebungFuss);
    el.lagePunkt = h("span", {class: "lk-lage-punkt", "aria-hidden": "true"});
    el.lageText = h("span", {class: "lk-lage-text"});
    el.schnell = h("div", {class: "lk-schnell", "aria-label": "Schnellaktionen"});
    el.lage = h("section", {class: "lk-modul lk-lage", "aria-label": "Lage"},
      h("div", {class: "lk-lage-zeile"}, el.lagePunkt, el.lageText, el.schnell));
    el.auf = h("div", {class: "lk-auf"}, el.jetzt, el.uebung, el.lage);
    karte = h("div", {class: "leiste-karte"}, zeile, el.auf);
    root.append(karte);
    karte.addEventListener("pointerenter", () => {
      karte.classList.add("hover");
      clearTimeout(zuTimer); zuTimer = null;
      if (!auf && !aufTimer) aufTimer = setTimeout(() => { aufTimer = null; aufklappen(); }, zeit("mittel", 240));
      zeichnen();                    /* beim Aufklappen den echten Stand von jetzt zeigen */
    });
    karte.addEventListener("pointerleave", () => {
      karte.classList.remove("hover");
      clearTimeout(aufTimer); aufTimer = null;
      clearTimeout(zuTimer);
      /* 31.10.2026: von 5 s auf 1 s verkürzt (Nutzerwunsch: „lass es nach einer Sekunde
         zusammenfallen, wenn der Cursor es verlässt"). Eine Sekunde reicht, um von der
         Statuszeile in den aufgeklappten Bereich zu wechseln; danach fällt die Karte zu. */
      zuTimer = setTimeout(zuklappen, 1000);
    });
    container.replaceChildren(root);
    auf = false;
    for (const k of Object.keys(merker)) delete merker[k];   /* frischer Aufbau: Module neu bauen */
    darstellen();
    zeichnen();
    griffZeichnen();
    groesse(ZU);
  }
  function abbauen(){
    clearTimeout(zuTimer); clearTimeout(aufTimer); clearTimeout(ziehTimer); clearTimeout(quizTimer);
    zuTimer = aufTimer = ziehTimer = quizTimer = null;
    if (mini && mini.parentNode) mini.remove();
    if (hilfe && hilfe.parentNode) hilfe.remove();
    root?.remove(); root = null; karte = null; el = {}; auf = false;
    for (const k of Object.keys(merker)) delete merker[k];
  }
  function groesse([b, hh]){
    const m = ++groesseMarke;
    try { Promise.resolve(Plattform.fenster.groesse(b, hh)).catch(e => { if (m === groesseMarke) console.warn("Leiste Größe", e); }); } catch (e) { console.warn(e); }
  }
  /* Aufklappen: das Fenster wird ZUERST groß (sonst schnitte die OS-Grenze den Inhalt ab), dann
     wächst die Karte mit 320 ms; der Inhalt folgt gestaffelt (CSS). */
  function aufklappen(){
    if (!karte || auf) return;
    auf = true;
    clearTimeout(zuTimer); zuTimer = null;
    groesse([320, uebungFertig ? HOEHE.antwort : uebungOffen ? HOEHE.uebung : HOEHE.ruhe]);
    zeichnen();                      /* „Jetzt dran"/Mini/Schnellaktionen mit echtem Stand füllen */
    griffZeichnen();
    if (ruhig()) { karte.classList.add("auf"); miniVerdichten(); return; }
    requestAnimationFrame(() => {
      if (!karte || !auf) return;
      karte.classList.add("auf");
      /* Nach der Höhen-Animation messen, ob Frage + Optionen ohne Scrollen passen. */
      setTimeout(miniVerdichten, zeit("mittel", 240));
    });
  }
  /* Zuklappen: der Inhalt blendet zuerst aus (160 ms), dann schrumpft die Karte (240 ms ab 80 ms
     Versatz); die Fenstergröße zieht NACH der Animation nach – sonst schnitte das Fenster den
     schrumpfenden Inhalt ab. „Bewegung aus"/reduziert: alles sofort. */
  function zuklappen(){
    zuTimer = null;
    if (!karte || !auf || karte.classList.contains("hover")) return;
    auf = false;
    karte.classList.remove("auf", "hilfe-an");
    griffZeichnen();
    if (ruhig()) { groesse(ZU); return; }
    const nach = zeit("lang", 320);
    clearTimeout(ziehTimer);
    const ziehen = () => { if (!auf && karte) groesse(ZU); };
    const ende = ev => {
      if (ev && ev.propertyName && ev.propertyName !== "height" && ev.propertyName !== "width") return;
      clearTimeout(ziehTimer); ziehTimer = null;
      if (karte && typeof karte.removeEventListener === "function") karte.removeEventListener("transitionend", ende);
      ziehen();
    };
    ziehTimer = setTimeout(() => { if (karte && typeof karte.removeEventListener === "function") karte.removeEventListener("transitionend", ende); ziehen(); }, nach);
    if (typeof karte.addEventListener === "function") karte.addEventListener("transitionend", ende);
  }
  function griffZeichnen(){
    if (!el.griff) return;
    el.griff.setAttribute("aria-label", auf ? "Leiste zuklappen" : "Leiste aufklappen");
    el.griff.setAttribute("aria-expanded", String(auf));
    el.griff.title = auf ? "Zuklappen (Ziehen verschiebt die Leiste)" : "Aufklappen (Ziehen verschiebt die Leiste)";
    el.griff.replaceChildren(UI.symbol(auf ? "pfeilUnten" : "pfeilOben", 16));
  }
  /* Der Knopf in der Statuszeile klappt den vorhandenen Hilfe-Bereich auf (nicht doppelt bauen: derselbe
     DOM-Bereich UI.leiste.miniHilfe, den Baustein C füllt). Er zeigt Denkhilfe oder Lernanker und
     schließt bei erneutem Klick wieder; die Karte bleibt dabei aufgeklappt. */
  function hilfeOeffnen(){
    hilfeEl();
    if (!auf) aufklappen();
    if (karte) karte.classList.toggle("hilfe-an");
    setTimeout(miniVerdichten, zeit("mittel", 240));      /* geteilter Platz: Mini ggf. weiter verdichten */
  }
  /* „Mini wartet" heißt: im Mini-Bereich stehen unbeantwortete Antwortknöpfe (.mk-optionen).
     Nach der Antwort zeichnet Baustein C dort das Ergebnis – dann verschwindet das Zeichen wieder.
     Nur lesen, nichts anfassen: das Mini gehört Baustein C. */
  function miniSignal(){
    if (el.miniWartet){
      const wartet = !!(mini && typeof mini.querySelector === "function" && mini.querySelector(".mk-optionen"));
      el.miniWartet.hidden = !wartet;
    }
    pruefenSignal();
  }
  /* Wer ein Mini zeichnet, ruft nicht immer status – deshalb am Bereich selbst mitlesen.
     Ohne MutationObserver (Node-Prüfstand) trägt der Weg über status/zeichnen das Zeichen. */
  function miniBeobachten(){
    if (beobachter || !mini || typeof MutationObserver !== "function") return;
    try {
      beobachter = new MutationObserver(() => { miniSignal(); fokusAus(mini); miniVerdichten(); });
      beobachter.observe(mini, {childList: true, subtree: true});
    } catch (e) { beobachter = null; }
  }
  /* Reicht der Platz im Mini-Bereich nicht für Frage + Antwortoptionen, wird der Schnappschuss
     ausgeblendet – am echten DOM gemessen, nicht geschätzt. Der Mini-Kopf ist in der Leiste ohnehin
     ausgeblendet (Kicker und Fertigkeit stehen im Modulkopf). Der Bereich bleibt scrollbar als
     Notnagel. Ohne Layout (Node-Prüfstand) passiert nichts. */
  function miniVerdichten(){
    if (!mini || typeof mini.clientHeight !== "number" || !mini.clientHeight) return;
    mini.classList.remove("lk-knapp", "lk-scrollt");
    if (mini.scrollHeight > mini.clientHeight + 1) mini.classList.add("lk-knapp");
    /* erst nach dem Verdichten entscheiden: passt es weiterhin nicht, zeigt die weiche Kante,
       dass es innen weitergeht (kein abgeschnittenes Wort ohne Hinweis). */
    if (mini.scrollHeight > mini.clientHeight + 1) mini.classList.add("lk-scrollt");
  }
  /* Die Statuskapsel: Stufe · Rolle vollständig; passt sie im echten DOM nicht, ehrlich auf „Stufe N" kürzen. */
  function stufenZeichnen(){
    if (!el.ampeln) return;
    const voll = stufeRolle();
    if (merker.stufe !== voll) {
      merker.stufe = voll;
      delete el.ampeln.dataset.lang;
      el.ampeln.textContent = voll;
      el.ampeln.title = voll;
    }
    if (el.ampeln.clientWidth > 0 && el.ampeln.dataset.lang !== "kurz" && el.ampeln.scrollWidth > el.ampeln.clientWidth + 1) {
      const kurz = kurzStufe(voll);
      el.ampeln.textContent = kurz;
      el.ampeln.dataset.lang = "kurz";
      el.ampeln.title = voll;
    }
  }
  /* Die drei Werte in EINER Zeile; reicht der Platz im echten DOM nicht, eine Stufe kleiner (Token). */
  function werteZeichnen(){
    if (!el.wertes) return;
    const z = zustand;
    el.euro.textContent = euroText(z.euroProStunde);
    el.ruf.textContent = "Ruf " + (z.ruf == null ? "–" : zahlDe(z.ruf));
    const n = +z.offen || 0;
    el.offen.classList.toggle("hat", n > 0);
    el.offen.replaceChildren(h("span", {class: "lk-punkt"}),
      n === 1 ? "1" : zahlDe(n), h("span", {class: "lk-offen-wort"}, " offen"));
    el.offen.title = n === 1 ? "1 offenes Ticket" : zahlDe(n) + " offene Tickets";
    if (el.wertes.clientWidth > 0) {
      el.wertes.classList.remove("lk-knapp");
      if (el.wertes.scrollWidth > el.wertes.clientWidth + 1) el.wertes.classList.add("lk-knapp");
    }
  }

  /* Deckkraft/Ecke aus den Einstellungen (Standard 0,92, einstellbar 0,6–1 – Runde 5 § 2 C). */
  function darstellen(){
    if (!root) return;
    const e = einstLeiste();
    const d = +e.deckkraft;
    root.style.setProperty("--leiste-deckkraft", String(Number.isFinite(d) ? klemme0(d, 0.6, 1) : 0.92));
    root.dataset.ecke = ["ol", "or", "ul", "ur"].includes(e.ecke) ? e.ecke : "ur";
  }
  function zeichnen(){
    if (!root) return;
    stufenZeichnen();
    werteZeichnen();
    miniSignal();
    moduleZeichnen();
  }
  function status(s){ if (s && typeof s === "object") Object.assign(zustand, s); zeichnen(); }

  return {aufbauen, abbauen, status, darstellen, aufklappen, zuklappen,
          get miniBereich(){ return typeof document !== "undefined" ? miniEl() : null; },
          get miniHilfe(){ return typeof document !== "undefined" ? hilfeEl() : null; },
          get aufgebaut(){ return !!root; }, get offenAuf(){ return auf; }, get zustand(){ return {...zustand}; }};
})();