"use strict";
/* ---------- Die Leiste: kompaktes Nebenbei-Cockpit (Bento 2.5, Entwurf § 3.5) ----------
   UI.leiste.aufbauen(container) / abbauen()      (UI.modus ruft das auf)
   UI.leiste.status({ampeln:[{name, farbe:"gruen"|"gelb"|"rot", zustand}], euroProStunde, ruf, offen, text, titel})
   UI.leiste.miniBereich   DOM-Element für ein Mini-Ticket (Inhalt kommt vom Spiel; bleibt über Umbauten erhalten)
   UI.leiste.miniHilfe     DOM-Element für Denkhilfe und Lernanker des Mini-Tickets (Vertrag § 5)
   Regeln: nur Maus, keine Tastatur, kein Ton, kein Fokusklau. 55 % deckend ohne Maus (einstellbar), voll deckend mit Maus,
   klappt bei Maus darüber auf (320×300) und 1 s nach dem Verlassen wieder zu (300×56). Ziehbar über die Griffleiste.
   Zugeklappt dieselbe Statuszeile wie bisher, jetzt mit gelabelten Werten (7 €/h · Ruf 14 · 3 offen).
   Aufgeklappt unter derselben Zeile ein Bento: „Jetzt dran" (eine Zeile, Kunde · Titel · Aktion),
   das vorhandene Mini-Ticket (UI.karriere.miniZeichnen liefert den Inhalt; größter Bereich) und
   „Verträge" (zwei Zeilen) plus feste Fußzeile mit Schnellaktionen.
   Keine erfundenen Zahlen: alles kommt aus zustand (UI.leiste.status), Spiel.* oder DATEN. */
UI.leiste = (() => {
  const ZU = [300, 56], AUF = [320, 300];     /* aufgeklappt: Platz für das ganze Bento ohne Karten-Scrollen */
  const zustand = {ampeln: [], euroProStunde: null, ruf: null, offen: 0, text: "", titel: ""};
  let root = null, karte = null, el = {}, auf = false, zuTimer = null, aufTimer = null, groesseMarke = 0;
  let mini = null;                 /* erst bei Bedarf anlegen (keine Aufrufe beim Laden) */
  let hilfe = null;
  let beobachter = null;           /* liest mit, wenn Baustein C ein Mini in den Bereich zeichnet */
  /* Merker der Modul-Inhalte: nur neu bauen, wenn sich die echten Werte geändert haben
     (ein Knopf unter der Maus wird also nicht bei jedem Zustandsereignis ausgetauscht). */
  const merker = {};
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
    if (!mini) { mini = fokusFrei(h("div", {class: "lk-mini", "aria-label": "Mini-Ticket"})); miniBeobachten(); }
    return mini;
  };
  /* Eigener Bereich unter dem Ticket: der Hilfe-Knopf soll beim Scrollen nicht verschwinden (§ 5). */
  const hilfeEl = () => hilfe ||= fokusFrei(h("div", {class: "lk-mini-hilfe", "aria-label": "Denkhilfe und Lernanker"}));

  const einstLeiste = () => Object.assign({deckkraft: 0.55, ecke: "ur"}, (store.get("einst", {}) || {}).leiste);
  const FARBE = {gruen: "ok", ok: "ok", green: "ok", gelb: "warn", warn: "warn", yellow: "warn", orange: "warn", rot: "bad", bad: "bad", red: "bad"};
  function ampelSymbol(farbe){
    const f = FARBE[farbe] || "ok";
    const s = sv("svg", {viewBox: "0 0 12 12", width: 12, height: 12, class: "lk-ampel-sym f-" + f, "aria-hidden": "true"});
    if (f === "ok") s.append(sv("circle", {cx: 6, cy: 6, r: 5}));
    else if (f === "warn") s.append(sv("path", {d: "M6 1l5 9.5H1z"}));
    else s.append(sv("rect", {x: 1.5, y: 1.5, width: 9, height: 9, rx: 1}));
    return s;
  }
  const euroText = x => x == null || isNaN(x) ? "–" : `${Math.round(x).toLocaleString("de-DE")} €/h`;
  /* Lesen aus dem Spiel darf nie die Leiste zerlegen: ein fehlender Baustein ist ein leerer Wert, kein Absturz. */
  const sicher = (fn, rueck) => { try { return fn(); } catch (e) { return rueck; } };

  /* ---------- Echte Daten fürs Bento ---------- */
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

  /* ---------- Kleine Bausteine (nur Maus, kein Fokusklau) ---------- */
  const kicker = text => h("span", {class: "lk-kicker"}, text);
  function knopf(klasse, text, titel, fn, ...kinder){
    return h("button", {type: "button", class: klasse, tabindex: "-1", title: titel || text,
      onmousedown: e => e.preventDefault(), onclick: fn}, ...(kinder.length ? kinder : [text]));
  }
  /* Echter Weg in die Vollansicht; optional danach ein Aufruf (z. B. UI.spiel.oeffnen). */
  function zumVoll(name, danach){
    if (name) sicher(() => UI.app.ansicht(name), null);
    sicher(() => UI.modus("voll"), null);
    if (danach) sicher(danach, null);
  }
  function cockpitOeffnen(a){
    if (a && a.aktiv && a.inst && a.inst.iid) zumVoll(null, () => UI.spiel.oeffnen(a.inst.iid));
    else zumVoll("postfach");
  }

  /* ---------- Modul 1: „Jetzt dran" ---------- */
  function jetztZeichnen(){
    if (!el.jetzt) return;
    const a = naechsterAuftrag();
    const eurWert = a && a.def && a.def.lohn && typeof a.def.lohn.euro === "number" ? a.def.lohn.euro : null;
    const schluessel = a ? ["auftrag", a.aktiv, a.inst.iid, a.def.id, a.def.titel, a.def.minuten, eurWert].join("|") : "leer|" + zustand.text;
    if (schluessel === merker.jetzt) return;
    merker.jetzt = schluessel;
    if (!a) {
      el.jetzt.replaceChildren(
        h("div", {class: "lk-modul-kopf"}, kicker("Jetzt dran")),
        h("p", {class: "lk-leer"}, zustand.text || "Kein Auftrag offen – das Postfach füllt sich, sobald ein Kunde schreibt."));
      return;
    }
    const kunde = kundeName(a.inst.kunde || a.def.kunde);
    const lohn = eurWert != null ? `${zahlDe(Math.round(eurWert))} €` : null;
    const zeit = a.def.minuten != null ? `${zahlDe(a.def.minuten)} min` : null;
    const meta = [lohn, zeit].filter(Boolean).join(" · ");
    const titel = a.def.titel || "Auftrag";
    /* EINE Zeile: Kunde · Titel, rechts die Hauptaktion. Lohn/Zeit stehen im Titel von Zeile und
       Aktion – in der 320-px-Karte bleibt sonst keine Zeile für die Antwortoptionen übrig. */
    el.jetzt.replaceChildren(
      h("div", {class: "lk-jetzt", title: `${kunde} · ${titel}` + (meta ? ` · ${meta}` : "")},
        h("span", {class: "lk-jetzt-text"},
          h("span", {class: "lk-jetzt-kunde"}, kunde), " · ",
          h("b", {class: "lk-jetzt-titel"}, titel)),
        knopf("lk-knopf lk-knopf-primaer", a.aktiv ? "Fortsetzen" : "Öffnen",
          (a.aktiv ? "Diesen Auftrag im Labor fortsetzen" : "Nächsten Auftrag im Postfach öffnen") + (meta ? ` · ${meta}` : ""),
          () => cockpitOeffnen(a))));
  }

  /* ---------- Modul 2: Mini-Ticket (unten) ---------- */

  /* ---------- Modul 3: Status & Verträge ---------- */
  function statusZeichnen(){
    if (!el.status) return;
    const ampeln = Array.isArray(zustand.ampeln) ? zustand.ampeln.slice(0, 6) : [];
    const eph = zustand.euroProStunde;
    const offen = +zustand.offen || 0;
    const tag = tagStand();
    const werte = [];
    if (eph != null && !isNaN(eph)) werte.push(euroText(eph));
    werte.push(`${zahlDe(offen)} offen`);
    if (tag && tag.serie > 0) werte.push(`Serie ${zahlDe(tag.serie)}`);
    const schluessel = [ampeln.map(a => [a.name, a.farbe, a.zustand].join(":")).join(","), eph, offen, tag ? [tag.serie, tag.erledigt, tag.ziel].join("/") : null, zustand.text].join("|");
    if (schluessel === merker.status) return;
    merker.status = schluessel;
    const rechts = h("div", {class: "lk-kopf-rechts"});
    if (tag && tag.ziel > 0) {
      /* Feiner Heute-Punkt: erledigte von geplanten Tickets, nur aus Spiel.tag.heute(). */
      rechts.append(h("span", {class: "lk-heute", title: `Heute: ${zahlDe(tag.erledigt)} von ${zahlDe(tag.ziel)} Tickets`},
        h("i", {class: "lk-heute-fuell", style: {width: Math.round(klemme(tag.erledigt / tag.ziel, 0, 1) * 100) + "%"}})));
    }
    rechts.append(h("span", {class: "lk-meta"}, werte.join(" · ")));
    const kopf = h("div", {class: "lk-modul-kopf"}, kicker("Verträge"), rechts);
    /* Zweite Zeile: Vertragspaare als Ampel + Name (Zustand im Titel). Mehr als zwei passen nicht
       in die Zeile – der Rest wird ehrlich als „+N" gezählt. */
    const zeile = h("div", {class: "lk-vertragszeile"});
    if (!ampeln.length) {
      zeile.append(h("span", {class: "lk-leise"}, zustand.text || "Noch kein Wartungsvertrag – im Shop anlegen."));
    } else {
      for (const a of ampeln.slice(0, 2)) {
        zeile.append(h("button", {type: "button", class: "lk-vertrag", tabindex: "-1",
          title: `${a.name || "Vertrag"} – ${a.zustand || "läuft"} · Kunden öffnen`,
          onmousedown: e => e.preventDefault(), onclick: () => zumVoll("kunden")},
          ampelSymbol(a.farbe), h("span", {class: "lk-vertrag-name"}, a.name || "Vertrag")));
      }
      if (ampeln.length > 2) zeile.append(h("span", {class: "lk-mehr"}, `+${ampeln.length - 2}`));
    }
    el.status.replaceChildren(kopf, zeile);
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
      UI.symbol("postfach", 14), h("span", {}, "Postfach"),
      offen > 0 ? h("span", {class: "lk-zaehler"}, zahlDe(offen)) : null);
    const labor = knopf("lk-knopf lk-knopf-aktion", "Labor", "Zurück ins Labor", () => zumVoll("labor"),
      UI.symbol("labor", 14), h("span", {}, "Labor"));
    el.schnell.replaceChildren(...[postfach, labor, el.ausblenden].filter(Boolean));
  }

  function moduleZeichnen(){
    jetztZeichnen();
    statusZeichnen();
    schnellZeichnen();
  }

  /* ---------- Aufbau ---------- */
  function aufbauen(container){
    abbauen();
    root = h("div", {class: "leiste-wurzel" + (Plattform.name === "browser" ? " im-browser" : "")});
    const drag = {"data-tauri-drag-region": ""};
    el.ampeln = h("div", {class: "lk-ampeln", ...drag});
    el.euro = h("span", {class: "lk-wert lk-euro", title: "Einnahmen je Stunde aus Wartungsverträgen", ...drag});
    el.ruf = h("span", {class: "lk-wert lk-ruf", title: "Ruf bei deinen Kunden", ...drag});
    el.offen = h("span", {class: "lk-offen", title: "Offene Tickets im Postfach", ...drag});
    /* Der Hilfe-Knopf sitzt in der STATUSZEILE, nicht im aufgeklappten Bereich: dort war er zugeklappt
       von `overflow:hidden` abgeschnitten und erst nach 280 ms Mausberührung erreichbar
       (Review Auffindbarkeit, Befund 5). Er klappt den vorhandenen Bereich `UI.leiste.miniHilfe` auf;
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
    const oeffnen = h("button", {type: "button", class: "lk-oeffnen", tabindex: "-1", title: "Vollansicht öffnen",
      onmousedown: e => e.preventDefault(), onclick: () => UI.modus("voll")}, UI.symbol("oeffnen", 18), h("span", {}, "öffnen"));
    const tray = Plattform.kann("tray");
    const ausblenden = tray.ja ? h("button", {type: "button", class: "lk-klein", tabindex: "-1", title: "Ins Tray ausblenden", onmousedown: e => e.preventDefault(),
      onclick: () => UI.modus("tray")}, "ausblenden") : null;
    el.ausblenden = ausblenden;
    /* Die Statuszeile: Reihenfolge und Klassen sind Vertrag (tests/spiel-leiste-hilfe.test.js). */
    const zeile = h("div", {class: "lk-zeile"},
      h("div", {class: "lk-griff", title: "Ziehen, um die Leiste zu verschieben", ...drag}, UI.symbol("griff", 16)),
      el.ampeln, h("div", {class: "lk-werte", ...drag}, el.euro, el.ruf, el.offen), el.miniWartet, el.hilfeKnopf, oeffnen);
    /* Das Bento: dieselben Flächen bleiben stehen; nur ihre Inhalte werden nachgezogen. */
    el.jetzt = h("section", {class: "lk-modul", "aria-label": "Jetzt dran"});
    el.miniModul = h("section", {class: "lk-modul lk-mini-modul", "aria-label": "Mini-Ticket"}, miniEl(), hilfeEl());
    el.status = h("section", {class: "lk-modul", "aria-label": "Status und Verträge"});
    el.schnell = h("div", {class: "lk-schnell", "aria-label": "Schnellaktionen"});
    karte = h("div", {class: "leiste-karte"},
      zeile,
      h("div", {class: "lk-auf"}, el.jetzt, el.miniModul, el.status, el.schnell));
    root.append(karte);
    karte.addEventListener("pointerenter", () => {
      karte.classList.add("hover");
      clearTimeout(zuTimer); zuTimer = null;
      if (!auf && !aufTimer) aufTimer = setTimeout(() => { aufTimer = null; aufklappen(); }, 280);
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
    groesse(ZU);
  }
  function abbauen(){
    clearTimeout(zuTimer); clearTimeout(aufTimer); zuTimer = aufTimer = null;
    if (mini && mini.parentNode) mini.remove();
    if (hilfe && hilfe.parentNode) hilfe.remove();
    root?.remove(); root = null; karte = null; el = {}; auf = false;
    for (const k of Object.keys(merker)) delete merker[k];
  }
  function groesse([b, hh]){
    const m = ++groesseMarke;
    try { Promise.resolve(Plattform.fenster.groesse(b, hh)).catch(e => { if (m === groesseMarke) console.warn("Leiste Größe", e); }); } catch (e) { console.warn(e); }
  }
  function aufklappen(){
    if (!karte || auf) return;
    auf = true;
    groesse(AUF);
    zeichnen();                      /* „Jetzt dran"/Mini/Schnellaktionen mit echtem Stand füllen */
    requestAnimationFrame(() => {
      karte?.classList.add("auf");
      /* Nach der Höhen-Animation messen, ob Frage + Optionen ohne Scrollen passen. */
      setTimeout(miniVerdichten, 240);
    });
  }
  function zuklappen(){
    zuTimer = null;
    if (!karte || !auf || karte.classList.contains("hover")) return;
    auf = false;
    karte.classList.remove("auf", "hilfe-an");
    setTimeout(() => { if (!auf && karte) groesse(ZU); }, 200);
  }
  /* Der Knopf in der Statuszeile klappt den vorhandenen Hilfe-Bereich auf (nicht doppelt bauen: derselbe
     DOM-Bereich `UI.leiste.miniHilfe`, den Baustein C füllt). Er zeigt Denkhilfe oder Lernanker und
     schließt bei erneutem Klick wieder; die Karte bleibt dabei aufgeklappt. */
  function hilfeOeffnen(){
    hilfeEl();
    if (!auf) aufklappen();
    if (karte) karte.classList.toggle("hilfe-an");
    setTimeout(miniVerdichten, 240);      /* geteilter Platz: Mini ggf. weiter verdichten */
  }
  /* „Mini wartet" heißt: im Mini-Bereich stehen unbeantwortete Antwortknöpfe (`.mk-optionen`).
     Nach der Antwort zeichnet Baustein C dort das Ergebnis – dann verschwindet das Zeichen wieder.
     Nur lesen, nichts anfassen: das Mini gehört Baustein C. */
  function miniSignal(){
    if (!el.miniWartet) return;
    const wartet = !!(mini && typeof mini.querySelector === "function" && mini.querySelector(".mk-optionen"));
    el.miniWartet.hidden = !wartet;
  }
  /* Wer ein Mini zeichnet, ruft nicht immer `status` – deshalb am Bereich selbst mitlesen.
     Ohne MutationObserver (Node-Prüfstand) trägt der Weg über `status`/`zeichnen` das Zeichen. */
  function miniBeobachten(){
    if (beobachter || !mini || typeof MutationObserver !== "function") return;
    try {
      beobachter = new MutationObserver(() => { miniSignal(); fokusAus(mini); miniVerdichten(); });
      beobachter.observe(mini, {childList: true, subtree: true});
    } catch (e) { beobachter = null; }
  }
  /* Reicht der Platz im Mini-Bereich nicht für Frage + Antwortoptionen, wird zuerst der Schnappschuss
     ausgeblendet, danach der Mini-Kopf – gemessen am echten DOM, nicht geschätzt. Der Bereich bleibt
     scrollbar als Notnagel. Ohne Layout (Node-Prüfstand) passiert nichts. */
  function miniVerdichten(){
    if (!mini || typeof mini.clientHeight !== "number" || !mini.clientHeight) return;
    mini.classList.remove("lk-knapp", "lk-knapp2");
    if (mini.scrollHeight > mini.clientHeight + 1) mini.classList.add("lk-knapp");
    if (mini.scrollHeight > mini.clientHeight + 1) mini.classList.add("lk-knapp2");
  }
  /* Live-Ampeln: höchstens 6; passen sie nicht in die 300-px-Zeile, bleiben die ersten stehen und
     ein ehrliches „+N" sagt, wie viele noch da sind – kein abgeschnittenes Symbol ohne Hinweis. */
  function ampelnZeichnen(){
    const alle = Array.isArray(zustand.ampeln) ? zustand.ampeln : [];
    el.ampeln.replaceChildren();
    if (!alle.length) {
      el.ampeln.append(h("span", {class: "lk-keine", "data-tauri-drag-region": ""}, zustand.titel || "Netzwerk-Labor"));
      el.ampeln.title = "";
      return;
    }
    el.ampeln.title = alle.map(a => `${a.name}: ${a.zustand || ""}`.trim()).join(" · ");
    const bauen = n => {
      const kinder = alle.slice(0, n).map(a => h("span", {class: "lk-ampel", title: `${a.name}: ${a.zustand || ""}`.trim(), "data-tauri-drag-region": ""}, ampelSymbol(a.farbe)));
      if (alle.length > n) kinder.push(h("span", {class: "lk-mehr"}, `+${alle.length - n}`));
      el.ampeln.replaceChildren(...kinder);
    };
    let sichtbar = Math.min(alle.length, 6);
    bauen(sichtbar);
    /* Nur im echten DOM messbar (im Prüfstand gibt es kein Layout): dann von hinten kürzen. */
    if (el.ampeln.clientWidth > 0) while (sichtbar > 1 && el.ampeln.scrollWidth > el.ampeln.clientWidth) bauen(--sichtbar);
  }

  /* Deckkraft/Ecke aus den Einstellungen */
  function darstellen(){
    if (!root) return;
    const e = einstLeiste();
    root.style.setProperty("--leiste-deckkraft", String(klemme(+e.deckkraft || 0.55, 0.3, 1)));
    root.dataset.ecke = ["ol", "or", "ul", "ur"].includes(e.ecke) ? e.ecke : "ur";
  }
  function zeichnen(){
    if (!root) return;
    const z = zustand;
    ampelnZeichnen();
    /* Labels: €/h trägt seine Einheit, Ruf und offene Tickets stehen als kurze Wörter da. */
    el.euro.textContent = euroText(z.euroProStunde);
    el.ruf.textContent = "Ruf " + (z.ruf == null ? "–" : zahlDe(z.ruf));
    const n = +z.offen || 0;
    el.offen.classList.toggle("hat", n > 0);
    el.offen.replaceChildren(h("span", {class: "lk-punkt"}), h("span", {}, `${n} offen`));
    el.offen.title = n === 1 ? "1 offenes Ticket" : `${n} offene Tickets`;
    miniSignal();
    moduleZeichnen();
  }
  function status(s){ if (s && typeof s === "object") Object.assign(zustand, s); zeichnen(); }

  return {aufbauen, abbauen, status, darstellen, aufklappen, zuklappen,
          get miniBereich(){ return typeof document !== "undefined" ? miniEl() : null; },
          get miniHilfe(){ return typeof document !== "undefined" ? hilfeEl() : null; },
          get aufgebaut(){ return !!root; }, get offenAuf(){ return auf; }, get zustand(){ return {...zustand}; }};
})();
