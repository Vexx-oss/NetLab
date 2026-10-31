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
     „Im Labor fortsetzen", Sekundär „Auftrag lesen"), „Kurzübung (freiwillig)" und „Lage"
     (Verträge/Serie/offene in einer stillen Zeile, dazu Postfach/Labor/ausblenden).
   · RUNDE 6 – KURZÜBUNG MIT ECHTEM KONTEXT: Bei offenem Auftrag zeigt die Leiste die von
     Spiel.kurzfrage (reines Modul) erzeugte Frage ZUM AUFTRAG, mit Lage-Block (Geräte, Adressen,
     Ports, Zustand) direkt über der Frage; nur mit diesen Angaben ist sie beantwortbar (Nutzerbefund
     31.10.2026: die generische Mini-Frage war „nicht lösbar"). Die generische Mini-Frage bleibt als
     KOPFÜBUNG im Mini-Ticket-Dialog und als Rückfall, wenn das Modul fehlt. Ohne verwertbare Frage
     steht dort ein ehrlicher Satz und „Im Labor öffnen" – nichts Unlösbares. Die Antwort ist lokal
     (Map je iid, kein Spielzustand) und bleibt beim Neuzeichnen und Wiederöffnen erhalten.
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
  /* Höhen der aufgeklappten Karte. Ruhe 300 (Vertrag) und der Mini-Zweig wie in Runde 5
     (Übung geöffnet 420, nach der Antwort 480). Der neue Kontext-Zweig braucht mehr Platz, weil
     Lage-Block, Frage und drei Antwortflächen zusammen kommen: geöffnet 560, mit Erklärung und
     fester Aktion 680. Diese Werte sind nur der Fallback – am echten DOM misst kurzAnpassen nach
     und wächst ausschließlich nach oben, damit im geöffneten und im Antwort-Zustand NICHTS
     abgeschnitten ist (ohne Layout, im Node-Prüfstand, gelten die Zahlen). */
  const HOEHE = {ruhe: 300, uebung: 420, antwort: 480, kurz: 560, kurzAntwort: 680};
  const HOECHST = 900;             /* Obergrenze der Karte (Bildschirmhöhe minus Rand, siehe hoechstHoehe) */
  const zustand = {ampeln: [], euroProStunde: null, ruf: null, offen: 0, text: "", titel: ""};
  let root = null, karte = null, el = {}, auf = false, zuTimer = null, aufTimer = null;
  let groesseMarke = 0, ziehTimer = null, quizTimer = null;
  let uebungOffen = false, uebungFertig = false;
  let uebungZweig = "leer";        /* „kurz" (Kontextfrage) · „mini" (Rückfall) · „leer" (kein Quiz) */
  let kurzIid = null;              /* Instanz, zu der die gezeigte Kontextfrage gehört */
  let kurzFrageKey = "";           /* iid|id|frage – wechselt die Frage, werden die Maße neu gemessen */
  let gesetzteHoehe = 0;           /* zuletzt gesetzte Fensterhöhe im aufgeklappten Zustand */
  let kartenZustand = "";          /* offen|fertig|zweig – messen nur bei echter Zustandsänderung */
  const kurzGemessen = {offen: 0, antwort: 0};        /* am echten DOM gemessene Mindesthöhen */
  const kurzFragen = new Map();    /* iid → {schluessel, q}: Frage bleibt beim Neuzeichnen stabil */
  const kurzAntworten = new Map(); /* iid → {qid, i, richtig}: Antwort lokal, kein Spielzustand */
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

  /* ---------- Runde 6: Kontextfrage aus dem laufenden Auftrag (Spiel.kurzfrage) ----------
     EIN Generator, der nur liest: Spiel.kurzfrage.fuer(inst, {niveau}) → Frage | null (Vertrag
     docs/entwicklung/Entwurf – Runde 6 § 2). Die Leiste fragt defensiv an (typeof + try/catch):
     fehlt das Modul, bleibt der Mini-Rückfall; liefert es null, gibt es keinen Quiz, sondern den
     ehrlichen Hinweis mit Weg ins Labor. Die Frage wird je Instanz und Zustand des Netzes
     (Schlüssel: iid + Niveau + Hash der Geräte/Laufzeiten) gemerkt, damit sie beim Neuzeichnen
     stabil bleibt und nur nach einer echten Netz-Änderung neu entsteht. */
  function kurzfrageModul(){
    return sicher(() => {
      const k = typeof Spiel === "object" && Spiel ? Spiel.kurzfrage : null;
      return k && typeof k === "object" && typeof k.fuer === "function" ? k : null;
    }, null);
  }
  function niveauVon(inst){
    return sicher(() => typeof Spiel.niveauVon === "function" ? Spiel.niveauVon(inst) : null, null);
  }
  /* Hash über das, was der Generator aus dem Netz liest: Gerätezustand (an) und Laufzeiten
     (running.ports/if) sowie die Adressen. Ändert der Spieler im Labor etwas, wird das erkannt. */
  function zustandsHash(inst){
    return sicher(() => {
      const n = inst && inst.netz;
      if (!n || !n.geraete) return "";
      const teile = [];
      for (const id of Object.keys(n.geraete).sort()) {
        const g = n.geraete[id] || {};
        teile.push([id, g.an === false ? 0 : 1, alsText(g.ip), alsText(g.maske), alsText(g.gw),
          g.running ? JSON.stringify(g.running) : ""].join(":"));
      }
      const s = teile.join("|");
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
      return String(h);
    }, "");
  }
  function kontextFrage(aktiv){
    const inst = aktiv && aktiv.inst ? aktiv.inst : null;
    const modul = kurzfrageModul();
    if (!inst || !inst.iid || !modul) return null;
    const niveau = niveauVon(inst);
    const schluessel = [inst.iid, niveau || "-", zustandsHash(inst)].join("|");
    const alt = kurzFragen.get(inst.iid);
    if (alt && alt.schluessel === schluessel) return alt.q;
    let q = null;
    try { const roh = modul.fuer(inst, niveau ? {niveau} : {}); q = roh && typeof roh === "object" ? roh : null; }
    catch (e) { q = null; }
    kurzFragen.set(inst.iid, {schluessel, q});
    return q;
  }
  /* Die Antwort gilt je Instanz (und Frage); sie liegt NUR hier im Speicher, nicht im Spielstand. */
  function antwortFuer(iid, q){
    if (!iid) return null;
    const e = kurzAntworten.get(iid);
    if (!e) return null;
    /* Nur dieselbe Frage: ändert sich Art oder Wortlaut (z. B. nach einer Netz-Änderung), gilt die
       alte Antwort nicht mehr. Die Antwort liegt bewusst NICHT im Spielstand. */
    if (q && e.qid && q.id && e.qid !== q.id) return null;
    if (q && e.qtext && q.frage && e.qtext !== q.frage) return null;
    return e;
  }
  function miniFertig(){
    return !!(mini && typeof mini.querySelector === "function" && mini.querySelector(".mk-ergebnis"));
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
  /* „Im Labor fortsetzen" (und „Im Labor prüfen" der Kurzübung): in die Vollansicht ans Gerät.
     Ist der Auftrag schon geladen, genügt der Wechsel; sonst wird er defensiv geöffnet (z. B. nach
     einem Neustart oder nach dem Wechsel aus dem Leistenmodus). */
  function laborMitAuftrag(iid, danach){
    zumVoll("labor", () => {
      sicher(() => UI.spiel.mappeZu(), null);
      sicher(() => {
        if (!UI.spiel || typeof UI.spiel.oeffnen !== "function" || !iid) return;
        const geladen = UI.spiel.inst && UI.spiel.inst.iid;
        if (!geladen || UI.spiel.inst.iid !== iid) UI.spiel.oeffnen(iid);
      }, null);
      if (typeof danach === "function") sicher(danach, null);
    });
  }
  function laborFortsetzen(a){
    if (!a) { zumVoll("postfach"); return; }
    laborMitAuftrag(a.inst && a.inst.iid, null);
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

  /* ---------- Modul 2: „Kurzübung (freiwillig)" · Runde 6 mit echtem Kontext ----------
     Bei offenem Auftrag rendert die Leiste die von Spiel.kurzfrage erzeugte Frage MIT LAGE-BLOCK –
     die Fakten, aus denen sich die Antwort ableiten lässt, stehen direkt über der Frage. Die
     generische Mini-Frage (UI.karriere.miniZeichnen in UI.leiste.miniBereich) bleibt als
     KOPFÜBUNG im Mini-Ticket-Dialog und als Rückfall, wenn das Modul fehlt. Drei Zweige:
       · „kurz": Kontextfrage mit Lage, Frage, drei Antwortflächen; nach der Antwort Erklärung +
         feste Aktion „Im Labor prüfen" (führt über q.ort ans Gerät).
       · „mini": bisheriger Weg (nur ohne Kurzfragen-Modul, z. B. ältere Fassung).
       · „leer": nichts Lösbares – ehrlicher Satz und „Im Labor öffnen".
     Die Antwort ist lokal (kurzAntworten je iid), kein Spielzustand, und bleibt beim Neuzeichnen
     und beim erneuten Öffnen derselben Instanz erhalten. Die Karte wächst im Kontext-Zweig stärker
     (HOEHE.kurz/kurzAntwort) und wird am echten DOM nachgemessen (kurzAnpassen) – nichts wird
     gekürzt, nur die Karte und das Leistenfenster größer. */
  function uebungZeichnen(){
    if (!el.uebung) return;
    const a = naechsterAuftrag();
    const aktiv = a && a.aktiv ? a : null;
    const inst = aktiv && aktiv.inst ? aktiv.inst : null;
    const iid = inst && inst.iid ? inst.iid : null;
    const modul = kurzfrageModul();
    const q = aktiv && modul ? kontextFrage(aktiv) : null;
    const antwort = q ? antwortFuer(iid, q) : null;
    /* „kurz" nur mit Frage; ohne Auftrag oder ohne Frage nie ein Quiz (nichts Unlösbares). */
    const zweig = q ? "kurz" : !aktiv ? "leer" : modul ? "leer" : "mini";
    /* Anderer Auftrag: Übungszustand dieser Instanz übernehmen (Antwort bleibt, sonst zugeklappt). */
    if (iid !== kurzIid){
      kurzIid = iid;
      merker.kurz = ""; merker.leer = "";
      uebungOffen = false; uebungFertig = false;
      kurzGemessen.offen = 0; kurzGemessen.antwort = 0;
    }
    uebungZweig = zweig;
    /* Neue Frage (andere Instanz, andere Art oder neuer Wortlaut): Maße neu messen. */
    const frageKey = q ? [iid || "", q.id || "", q.frage || ""].join("|") : "";
    if (frageKey !== kurzFrageKey){ kurzFrageKey = frageKey; kurzGemessen.offen = 0; kurzGemessen.antwort = 0; }
    if (zweig === "leer"){ uebungOffen = false; uebungFertig = false; }
    else {
      uebungFertig = zweig === "mini" ? miniFertig() : !!antwort;
      if (uebungFertig) uebungOffen = true;
    }
    /* Kopf: Kicker und Kontextzeile aus echten Daten des offenen Auftrags. */
    const m = zweig === "mini" ? aktuellesMini() : null;
    const fertigkeit = skillName(m && m.skill);
    const kunde = aktiv ? kundeName(inst.kunde || aktiv.def.kunde) : "";
    const ziel = aktiv ? zielSatz(aktiv.def) : "";
    const titelAuftrag = aktiv ? alsText(aktiv.def.titel) : "";
    const kickerText = zweig === "kurz" ? "Kurzübung · " + (alsText(q.titel) || "Frage")
      : fertigkeit ? "Kurzübung · " + fertigkeit : "Kurzübung";
    /* Kontextzeile im 284-px-Raster: „Zum Auftrag: Kunde · Titel". Der vollständige Zieltext steht
       im title (für 11 px ist er länger als die Zeile, abgeschnitten würde er mitten im Satz). */
    const kontext = aktiv ? ("Zum Auftrag: " + [kunde, titelAuftrag].filter(Boolean).join(" · ")) : "";
    const kontextVoll = aktiv ? ["Zum Auftrag", kunde, titelAuftrag, ziel ? "Ziel: " + ziel : ""].filter(Boolean).join(" · ") : "";
    const schluessel = [zweig, kickerText, kontext, iid || "", antwort ? antwort.i + ":" + (antwort.richtig ? "r" : "f") : "-"].join("|");
    if (schluessel !== merker.uebung){
      merker.uebung = schluessel;
      if (el.uebungKicker){ el.uebungKicker.textContent = kickerText; el.uebungKicker.title = kickerText; }
      if (el.uebungKontext){ el.uebungKontext.textContent = kontext; el.uebungKontext.title = kontextVoll || kontext; }
    }
    if (zweig === "kurz") kurzZeichnen(q, antwort);
    else if (zweig === "leer") leerZeichnen(aktiv);
    else if (el.uebungKurz){ merker.kurz = ""; el.uebungKurz.replaceChildren(); }
    el.uebung.classList.toggle("lk-kurzzweig", zweig === "kurz");
    el.uebung.classList.toggle("lk-minizweig", zweig === "mini");
    el.uebung.classList.toggle("lk-leerstand", zweig === "leer");
    karteAktualisieren();
  }
  /* Beschriftung des einen Schalters: öffnen, schließen – nach der Antwort und ohne Frage
     verschwindet er (CSS), die feste Aktion übernimmt. */
  function schalterText(){
    if (!el.uebungSchalter) return;
    el.uebungSchalter.textContent = uebungOffen ? "Einklappen ▾" : "Antworten ▸";
    el.uebungSchalter.title = uebungOffen ? "Kurzübung einklappen" : "Kurzübung öffnen: Lage, Frage und Antworten";
  }
  /* Kontextfrage zeichnen (nur wenn sich Frage oder Antwort geändert haben – sonst bliebe kein
     Klickziel unter der Maus stabil). Die Optionen sind nur Maus (tabindex -1, kein Fokusklau). */
  function kurzZeichnen(q, antwort){
    if (!el.uebungKurz) return;
    const lage = Array.isArray(q.lage) ? q.lage.slice(0, 4) : [];
    const optionen = Array.isArray(q.optionen) ? q.optionen.slice(0, 3) : [];
    const schluessel = [q.id || "", q.frage || "", lage.length, optionen.length,
      antwort ? antwort.i + ":" + (antwort.richtig ? "r" : "f") : "-"].join("|");
    if (schluessel === merker.kurz) return;
    merker.kurz = schluessel;
    const zeilen = lage.map(z => h("div", {class: "lk-kurz-lage-zeile"},
      h("span", {class: "lk-kurz-lage-label", title: alsText(z && z.label)}, alsText(z && z.label)),
      h("span", {class: "lk-kurz-lage-wert", title: alsText(z && z.wert)}, alsText(z && z.wert))));
    const knoepfe = optionen.map((o, i) => {
      const richtig = !!(o && o.richtig);
      const klasse = "lk-kurz-opt" + (antwort ? (richtig ? " richtig" : (i === antwort.i ? " falsch" : "")) : "");
      return h("button", {type: "button", class: klasse, tabindex: "-1", disabled: !!antwort,
        onmousedown: e => e.preventDefault(), onclick: () => kurzWaehlen(i)}, alsText(o && o.text));
    });
    const antwortTeil = antwort ? h("div", {class: "lk-kurz-antwort"},
      h("p", {class: "lk-kurz-erklaerung"},
        h("b", {}, antwort.richtig ? "Richtig. " : "Nicht ganz. "), alsText(q.erklaerung)),
      h("div", {class: "lk-knoepfe lk-kurz-fuss"},
        knopf("lk-knopf lk-knopf-primaer", "Im Labor prüfen",
          "Die Antwort am Gerät im Labor prüfen", () => kurzPruefen()))) : null;
    /* Kinder als Liste: replaceChildren übernimmt sonst den Text „null" ins DOM (am Bild gemessen). */
    const kinder = [
      h("div", {class: "lk-kurz-lage"}, h("span", {class: "lk-kicker"}, "Lage zum Auftrag"), ...zeilen),
      h("p", {class: "lk-kurz-frage"}, alsText(q.frage)),
      h("div", {class: "lk-kurz-optionen"}, ...knoepfe),
    ];
    if (antwortTeil) kinder.push(antwortTeil);
    el.uebungKurz.replaceChildren(...kinder);
  }
  function leerZeichnen(aktiv){
    if (!el.uebungLeer) return;
    const art = aktiv ? "keine" : "ohne";
    if (merker.leer === art) return;
    merker.leer = art;
    if (el.uebungKurz){ merker.kurz = ""; el.uebungKurz.replaceChildren(); }
    el.uebungLeer.textContent = aktiv
      ? "Für diesen Auftrag passt gerade keine Kurzfrage – im Labor siehst du das Netz und den nächsten Schritt."
      : "Ohne laufenden Auftrag gibt es keinen Übungskontext – öffne im Labor einen Auftrag.";
  }
  /* Antwort lokal merken (kein Spielzustand), dann Erklärung + Aktion zeichnen. Weitere Versuche
     sind gesperrt; die richtige Option wird markiert. */
  function kurzWaehlen(i){
    const a = naechsterAuftrag();
    const inst = a && a.aktiv ? a.inst : null;
    const modul = kurzfrageModul();
    if (!inst || !inst.iid || !modul) return;
    const q = kontextFrage(a);
    if (!q || antwortFuer(inst.iid, q)) return;
    const optionen = Array.isArray(q.optionen) ? q.optionen : [];
    if (!optionen[i] || !optionen[i].text) return;
    kurzAntworten.set(inst.iid, {qid: q.id || "", qtext: q.frage || "", i, richtig: !!optionen[i].richtig});
    merker.kurz = ""; merker.uebung = "";
    uebungOffen = true;
    uebungZeichnen();
    nachwachsen(kurzAnpassen);
  }
  /* „Im Labor prüfen": führt über q.ort ans Gerät (UI.fehlerziel.springen, Runde 4); fehlt der
     Resolver, wird das Labor geöffnet und das Gerät defensiv ausgewählt. Kein Fokusklau. */
  function kurzPruefen(){
    const a = naechsterAuftrag();
    const inst = a && a.aktiv ? a.inst : null;
    const iid = inst && inst.iid ? inst.iid : null;
    const q = inst && kurzfrageModul() ? kontextFrage(a) : null;
    const ort = q && q.ort && typeof q.ort === "object" ? q.ort : null;
    const ansGerät = () => {
      if (!ort) return;
      if (typeof (UI.fehlerziel && UI.fehlerziel.springen) === "function"){
        const r = sicher(() => UI.fehlerziel.springen(ort), null);
        if (r && r.ok) return;
      }
      if (ort.geraet) sicher(() => { if (UI.labor && typeof UI.labor.auswaehlen === "function") UI.labor.auswaehlen(ort.geraet, ort.port || undefined); }, null);
    };
    laborMitAuftrag(iid, ansGerät);
  }
  /* Auftrag offen? Fenster/Karte wachsen ZUERST (sonst schnitte die OS-Grenze den Inhalt ab). */
  function uebungOeffnen(){
    if (!karte || uebungOffen || uebungZweig === "leer") return;
    if (!auf) aufklappen();
    uebungOffen = true;
    karteAktualisieren();
    setTimeout(miniVerdichten, zeit("mittel", 240));
    setTimeout(miniVerdichten, zeit("lang", 320));
  }
  /* Einklappen vor der Antwort: Karte und Fenster wachsen erst NACH der Animation zurück. */
  function uebungEinklappen(){
    if (!karte || !uebungOffen || uebungFertig) return;
    uebungOffen = false;
    karteAktualisieren();
    clearTimeout(quizTimer);
    quizTimer = setTimeout(() => { if (karte && auf && !uebungOffen && !uebungFertig) fensterHoehe(HOEHE.ruhe); }, zeit("lang", 320));
  }
  /* Nach der Antwort (Mini-Zweig): Erklärung + feste Aktionszeile ganz sichtbar. Der Kontext-Zweig
     führt seinen Antwort-Zustand selbst (kurzZeichnen/karteAktualisieren). */
  function pruefenSignal(){
    if (uebungZweig !== "mini") return;
    const fertig = miniFertig();
    if (fertig === uebungFertig) return;
    uebungFertig = fertig;
    if (fertig) uebungOffen = true;
    karteAktualisieren();
  }
  /* Karte und Leistenfenster auf den Zweig und den Antwort-Zustand ziehen. Höhen kommen aus HOEHE
     und – sobald gemessen – aus kurzGemessen. Zuklappen verkleinert erst nach der Animation. */
  function karteAktualisieren(){
    if (!el.uebung) return;
    if (uebungFertig) uebungOffen = true;
    if (uebungZweig === "leer") uebungOffen = false;
    el.uebung.classList.toggle("lk-offen", !!uebungOffen);
    el.uebung.classList.toggle("lk-fertig", !!uebungFertig);
    if (!karte) return;
    const offen = uebungZweig !== "leer" && uebungOffen;
    karte.classList.toggle("uebung-offen", offen);
    karte.classList.toggle("uebung-fertig", offen && uebungFertig);
    hoehenVariablen();
    schalterText();
    if (!auf) return;
    const zustandKey = [offen, uebungFertig, uebungZweig].join("|");
    const neuerZustand = zustandKey !== kartenZustand;
    kartenZustand = zustandKey;
    if (offen){
      fensterHoehe(zielHoehe());
      if (neuerZustand){ nachwachsen(kurzAnpassen); wennSchriftenDa(kurzAnpassen); }
    } else {
      clearTimeout(quizTimer);
      quizTimer = setTimeout(() => { if (karte && auf && !uebungOffen) fensterHoehe(HOEHE.ruhe); }, zeit("lang", 320));
    }
  }
  /* Zielhöhe: Zweig + Zustand; nach oben durch den Bildschirm begrenzt (dann scrollt .lk-auf als
     Notnagel – lieber scrollen als abschneiden). */
  function zielHoehe(){
    const basis = uebungZweig === "kurz"
      ? (uebungFertig ? Math.max(HOEHE.kurzAntwort, kurzGemessen.antwort) : Math.max(HOEHE.kurz, kurzGemessen.offen))
      : uebungFertig ? HOEHE.antwort : HOEHE.uebung;
    return Math.min(basis, hoechstHoehe());
  }
  function hoechstHoehe(){
    return sicher(() => {
      const h = typeof window !== "undefined" && window.screen ? +window.screen.availHeight : 0;
      return h > 0 ? Math.max(360, Math.min(HOECHST, h - 24)) : HOECHST;
    }, HOECHST);
  }
  function fensterHoehe(hh){
    if (!auf) return;
    const ziel = Math.round(hh);
    if (!Number.isFinite(ziel) || ziel === gesetzteHoehe) return;
    gesetzteHoehe = ziel;
    groesse([320, ziel]);
  }
  function hoehenVariablen(){
    if (!karte || !karte.style || typeof karte.style.setProperty !== "function") return;
    const kurz = uebungZweig === "kurz";
    const offen = Math.max(kurz ? HOEHE.kurz : HOEHE.uebung, kurz ? kurzGemessen.offen : 0);
    const antwort = Math.max(kurz ? HOEHE.kurzAntwort : HOEHE.antwort, kurz ? kurzGemessen.antwort : 0);
    try {
      karte.style.setProperty("--lk-hoehe-offen", Math.round(offen) + "px");
      karte.style.setProperty("--lk-hoehe-fertig", Math.round(antwort) + "px");
    } catch (e) { /* nur Anzeige */ }
  }
  /* Am echten DOM nachmessen: reicht die Karte für Lage + Frage + Antworten + Erklärung? Es wird
     NUR nach oben korrigiert und nur die Karte wächst – nichts wird gekürzt. Ohne Layout (Node-
     Prüfstand) passiert nichts; dann gelten die HOEHE-Werte. */
  function kurzAnpassen(){
    if (!auf || !karte || !el.auf || !el.uebung || uebungZweig !== "kurz" || !uebungOffen) return;
    if (typeof el.auf.scrollHeight !== "number" || !el.auf.scrollHeight) return;
    if (typeof karte.clientHeight !== "number" || !karte.clientHeight) return;
    const kopf = el.zeile && el.zeile.offsetHeight ? el.zeile.offsetHeight : 40;
    const noetig = Math.round(kopf + el.auf.scrollHeight + 2);
    const feld = uebungFertig ? "antwort" : "offen";
    if (noetig <= (kurzGemessen[feld] || 0) + 1) return;
    kurzGemessen[feld] = noetig;
    hoehenVariablen();
    fensterHoehe(zielHoehe());
    setTimeout(kurzAnpassen, zeit("mittel", 240));   /* nach dem Wachsen gegenprüfen (endet, weil dann nichts mehr fehlt) */
  }
  function nachwachsen(fn){ setTimeout(fn, zeit("mittel", 240)); setTimeout(fn, zeit("lang", 320)); }
  function wennSchriftenDa(fn){
    sicher(() => {
      if (typeof document !== "undefined" && document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function")
        document.fonts.ready.then(() => setTimeout(fn, zeit("kurz", 80)));
    }, null);
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
    /* Das aufgeklappte Bento: drei Module. Modul 2 hat seit Runde 6 zwei Innenbereiche:
       .lk-kurz (Kontextfrage mit Lage) und den bisherigen Mini-Bereich (Rückfall/Kopfübung). */
    el.jetzt = h("section", {class: "lk-modul lk-jetzt", "aria-label": "Jetzt dran"});
    el.uebungKicker = kicker("Kurzübung");
    el.uebungSchalter = knopf("lk-link lk-link-stark", "Antworten ▸", "Kurzübung öffnen: Lage, Frage und Antworten",
      () => (uebungOffen ? uebungEinklappen() : uebungOeffnen()));
    el.uebungPruefen = knopf("lk-knopf lk-knopf-primaer", "Im Labor prüfen", "Antwort im Labor am Gerät prüfen", () => zumVoll("labor"));
    el.uebungFuss = h("div", {class: "lk-knoepfe lk-uebung-fuss"}, el.uebungPruefen);
    el.uebungKontext = h("p", {class: "lk-kontext"});
    /* Ohne verwertbare Frage: ehrlicher Satz und EIN Weg ins Labor – nichts Unlösbares. */
    el.uebungLeer = h("p", {class: "lk-leer"}, "Ohne laufenden Auftrag gibt es keinen Übungskontext – öffne im Labor einen Auftrag.");
    el.uebungWeg = h("div", {class: "lk-knoepfe lk-uebung-weg"},
      knopf("lk-knopf", "Im Labor öffnen", "Das Labor öffnen – dort siehst du das Netz des Auftrags", () => {
        const a = naechsterAuftrag();
        if (a && a.aktiv) zumVoll("labor"); else zumVoll("postfach");
      }));
    el.uebungKurz = h("div", {class: "lk-kurz"});
    el.uebung = h("section", {class: "lk-modul lk-uebung" + (uebungOffen ? " lk-offen" : ""), "aria-label": "Kurzübung (freiwillig)"},
      h("div", {class: "lk-modul-kopf"}, el.uebungKicker, el.uebungSchalter),
      el.uebungKontext, el.uebungLeer, el.uebungWeg, el.uebungKurz, miniEl(), hilfeEl(), el.uebungFuss);
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
    gesetzteHoehe = 0; kartenZustand = "";
    for (const k of Object.keys(merker)) delete merker[k];
    /* kurzFragen und kurzAntworten bleiben: die Antwort einer Instanz überlebt einen Neuaufbau
       der Leiste (z. B. Wechsel Leiste ↔ Vollansicht) – sie ist bewusst NICHT im Spielstand. */
  }
  function groesse([b, hh]){
    const m = ++groesseMarke;
    try { Promise.resolve(Plattform.fenster.groesse(b, hh)).catch(e => { if (m === groesseMarke) console.warn("Leiste Größe", e); }); } catch (e) { console.warn(e); }
  }
  /* Aufklappen: das Fenster wird ZUERST groß (sonst schnitte die OS-Grenze den Inhalt ab), dann
     wächst die Karte mit 320 ms; der Inhalt folgt gestaffelt (CSS). Die Höhe hängt am Zweig:
     Ruhe 300, Mini-Zweig 420/480, Kontext-Zweig 600/720 (und größer, sobald nachgemessen). */
  function aufklappen(){
    if (!karte || auf) return;
    auf = true;
    clearTimeout(zuTimer); zuTimer = null;
    fensterHoehe(uebungOffen && uebungZweig !== "leer" ? zielHoehe() : HOEHE.ruhe);
    zeichnen();                      /* „Jetzt dran"/Mini/Schnellaktionen mit echtem Stand füllen */
    griffZeichnen();
    if (ruhig()) { karte.classList.add("auf"); miniVerdichten(); kurzAnpassen(); return; }
    requestAnimationFrame(() => {
      if (!karte || !auf) return;
      karte.classList.add("auf");
      /* Nach der Höhen-Animation messen, ob Frage + Optionen ohne Scrollen passen. */
      setTimeout(miniVerdichten, zeit("mittel", 240));
      setTimeout(kurzAnpassen, zeit("mittel", 240));
      setTimeout(kurzAnpassen, zeit("lang", 320));
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
    if (ruhig()) { gesetzteHoehe = 0; groesse(ZU); return; }
    const nach = zeit("lang", 320);
    clearTimeout(ziehTimer);
    const ziehen = () => { if (!auf && karte) { gesetzteHoehe = 0; groesse(ZU); } };
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
          get aufgebaut(){ return !!root; }, get offenAuf(){ return auf; },
          get zustand(){ return {...zustand}; }};
})();
