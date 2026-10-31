"use strict";
/* ---------- Trainingsbereich: die Ansicht „training“ (Vertrag § 6, eigenes Präfix tr-) ----------
   Bento 2.5 (Entwurf § 3.4): Trainingsarena statt Kartenkaskade.
   · Kopf mit Mikrolabel, Titel, Kontextsatz und drei Kennzahlen (bestanden mit Fortschrittsring,
     Durchgänge, Bildungsstand) – alle Werte kommen aus Spiel.training.liste(), nichts erfunden.
   · Filterleiste Alle · Basis · Störung · Prüfung · Empfohlen · Noch offen. Der Filter lebt nur hier im
     UI-Modul und ändert ausschließlich die Sichtbarkeit (Klasse am Wurzelelement, CSS blendet aus);
     Daten und die 52 Karten im DOM bleiben unverändert – Standard „Alle“ zeigt alles.
   · Weiterlernen-Kachel, solange ein Durchgang läuft (Fortschritt aus Spiel.zieleStatus, sonst Versuch).
   · Lernpfade: die Szenarien nach Thema gruppiert, je Gruppe ein Kopf mit Name und „x von y bestanden“
     und darin kompakte .tr-karte-Karten (Art-Chip, Titel, ein Meta-Satz, Stand, ein Primärknopf,
     Gerüst als details, Quelle klein; die Beschreibung steht auf zwei Zeilen, der Volltext im title).
   · Ergebnis-/Fehlerkarte .tr-ergebnis bleibt in Aufbau und Klassen, nur ruhiger gestaltet.

   Verhalten unverändert: Start/Fortsetzen öffnen den Durchgang im Labor über den bestehenden Weg
   (UI.spiel.oeffnen) – dieselbe Simulation, dieselbe Hilfeleiter, dasselbe Terminal. Abgenommen wird
   über Spiel.training.abnehmen: kein Geld, kein Ruf, kein Postfach (Vertrag § 6).
   Das Gerüst (Leiter, Werkzeug, Tipp) zeigt nur, wessen Bildungsstand es hergibt – die Entscheidung
   fällt in Spiel.training.liste() (Spiel.stufe), hier wird sie nur gezeichnet.

   Angemeldet wird die Ansicht beim Laden über UI.startHaken (wie ui/karriere.js und ui/hub.js);
   src/ui/app.js bleibt unberührt. Der Dock-Knopf erscheint, weil „training“ in der REIHE steht.
   Hinweis: UI.symbol kennt (Stand heute) kein „lernen“ und zeichnet dafür das info-Zeichen. */
UI.training = (() => {
  let flaeche = null, letztes = null;
  /* Filterzustand lebt nur im UI-Modul, nie in den Daten. Standard „alle“ zeigt alle Szenarien. */
  let filter = "alle";
  let wurzel = null;
  let filterKnoepfe = [];

  const sterneText = s => "★".repeat(Math.floor(s)) + (s % 1 ? "½" : "") + "☆".repeat(Math.max(0, 5 - Math.ceil(s)));
  const ART = {basis: "Basis", stoerung: "Störung", pruefung: "Prüfung"};
  const GERAET = {host: "Endgerät", switch: "Switch", router: "Router", server: "Server", firewall: "Firewall", alle: "wechselnde Geräte"};
  const geraetText = g => !g ? "kein Fall im Training" : (GERAET[g] || g);
  /* Anzeigename des Bildungsstands; Wert kommt aus Spiel.training.liste(), die Kürzel sind nur Rückfall. */
  const BILDUNG = {azubi: "Azubi", "azubi-plus": "Azubi+", geselle: "Geselle", meister: "Meister"};
  const FILTER = [
    {id: "alle", name: "Alle"},
    {id: "basis", name: "Basis"},
    {id: "stoerung", name: "Störung"},
    {id: "pruefung", name: "Prüfung"},
    {id: "empfohlen", name: "Empfohlen"},
    {id: "offen", name: "Noch offen"},
  ];
  /* Lernpfade: Zuordnung Fertigkeit → Thema. Fertigkeiten ohne Zuordnung landen im letzten Pfad,
     damit keine Karte verloren geht – alle Szenarien stehen im DOM. */
  const PFADE = [
    {id: "link", name: "Link & Diagnose", skills: ["lab.link", "lab.ping", "lab.ttl"]},
    {id: "adresse", name: "Adressierung", skills: ["lab.ip", "lab.netz", "lab.subnetz", "lab.arp"]},
    {id: "switching", name: "VLAN & Switching", skills: ["lab.switch", "lab.vlan", "lab.trunk", "lab.rostick", "lab.stp"]},
    {id: "routing", name: "Routing & NAT", skills: ["lab.gateway", "lab.route", "lab.nat", "lab.portfwd"]},
    {id: "dienste", name: "Dienste", skills: ["lab.dhcp", "lab.dns", "lab.ports", "lab.tcp"]},
    {id: "sicherheit", name: "Sicherheit", skills: ["lab.acl", "lab.fw", "lab.dmz", "lab.portsec"]},
    {id: "betrieb", name: "Betrieb", skills: ["lab.cli", "lab.speichern", "lab.storage", "lab.betrieb"]},
  ];
  const REST = {id: "weitere", name: "Weitere Szenarien", skills: []};
  const PFAD_VON = new Map();
  for (const p of PFADE) for (const s of p.skills) PFAD_VON.set(s, p);
  /* Reihenfolge innerhalb eines Lernpfads: erst die Fertigkeiten in der Reihenfolge des Pfads,
     dann die Datenreihenfolge – so stehen verwandte Übungen beieinander. */
  const SKILL_RANG = new Map();
  for (const p of PFADE) p.skills.forEach((s, i) => SKILL_RANG.set(s, i));
  const bestanden = e => e.stand.bestanden > 0;

  /* ---------- Kopf und Kennzahlen ---------- */
  function bildungsstand(id){
    try {
      if (Spiel.stufe && typeof Spiel.stufe.def === "function") {
        const def = Spiel.stufe.def(id);
        if (def && def.kurz) return String(def.kurz);
      }
    } catch (e) { /* Rückfall unten */ }
    return BILDUNG[id] || String(id || "Azubi");
  }

  function kennzahl(kicker, wert, meta, ringProzent, ringTitel){
    return h("section", {class: "bn-k tr-kennzahl"},
      ringProzent == null ? null : h("span", {class: "tr-ring", role: "img", "aria-label": ringTitel, style: {"--tr-p": ringProzent}}),
      h("div", {class: "tr-kennzahl-text"},
        h("span", {class: "bn-kicker"}, kicker),
        h("strong", {class: "tr-kennzahl-wert"}, wert),
        h("span", {class: "tr-kennzahl-meta"}, meta)));
  }

  function kopf(liste){
    const anzahl = liste.length;
    const fertig = liste.filter(bestanden).length;
    const versuche = liste.reduce((s, e) => s + e.stand.versucht, 0);
    const gefuehrt = anzahl ? liste[0].gefuehrt : false;
    const stufe = anzahl ? liste[0].stufe : "azubi";
    const prozent = anzahl ? Math.round(fertig / anzahl * 100) : 0;
    return h("header", {class: "tr-kopf"},
      h("div", {class: "tr-kopf-text"},
        h("span", {class: "bn-kicker"}, "Training · Lernbereich"),
        h("h2", {}, "Training"),
        h("p", {class: "tr-kontext"}, "Üben abseits der Aufträge: kein Lohn, kein Ruf, kein Postfach. Was du hier schaffst, zählt für deinen Lernstand.")),
      h("div", {class: "tr-kennzahlen"},
        kennzahl("Bestanden", `${fertig} / ${anzahl}`, "Szenarien bestanden", prozent,
          `${fertig} von ${anzahl} Szenarien bestanden`),
        kennzahl("Durchgänge", String(versuche), versuche ? "Versuche insgesamt" : "noch kein Durchgang"),
        kennzahl("Bildungsstand", bildungsstand(stufe), gefuehrt ? "geführte Simulation mit Gerüst" : "Vorratsliste ohne Gerüst")));
  }

  /* ---------- Filterleiste: ändert nur die Sichtbarkeit, nie Daten ---------- */
  function filterleiste(liste){
    const zahlen = {
      alle: liste.length,
      basis: liste.filter(e => e.art === "basis").length,
      stoerung: liste.filter(e => e.art === "stoerung").length,
      pruefung: liste.filter(e => e.art === "pruefung").length,
      empfohlen: liste.filter(e => e.empfohlen).length,
      offen: liste.filter(e => !bestanden(e)).length,
    };
    filterKnoepfe = [];
    return h("section", {class: "bn-k flach tr-filter"},
      h("span", {class: "bn-kicker"}, "Filter"),
      h("div", {class: "tr-filter-knoepfe"}, FILTER.map(f => {
        const knopf = h("button", {type: "button", class: "tr-filter-knopf",
          "aria-pressed": f.id === filter ? "true" : "false",
          title: f.id === "offen" ? "Szenarien ohne bestandenen Durchgang" : `Nur ${f.name} anzeigen`,
          onclick: () => filterSetzen(f.id)}, f.name, h("span", {class: "tr-filter-zahl"}, String(zahlen[f.id])));
        filterKnoepfe.push({id: f.id, el: knopf});
        return knopf;
      })));
  }
  function filterSetzen(id){
    filter = id;
    filterAnwenden();
  }
  function filterAnwenden(){
    if (!wurzel) return;
    /* „Alle“ ist der Grundzustand ohne Zusatzklasse – CSS blendet bei den anderen Filtern aus. */
    wurzel.className = "tr-seite" + (filter === "alle" ? "" : " tr-f-" + filter);
    for (const k of filterKnoepfe) k.el.setAttribute("aria-pressed", k.id === filter ? "true" : "false");
  }

  /* ---------- Weiterlernen: der offene Durchgang steht oben ---------- */
  function zielFortschritt(e){
    /* Fortschritt ist ein echter Messwert (Spiel.zieleStatus prüft nur, es ändert nichts). Fehlt er,
       steht statt einer erfundenen Zahl der Versuch da. */
    try {
      if (typeof Spiel.instanz !== "function" || typeof Spiel.zieleStatus !== "function") return null;
      const inst = Spiel.instanz(e.laeuft);
      if (!inst) return null;
      const status = Spiel.zieleStatus(inst) || [];
      if (!status.length) return null;
      return {fertig: status.filter(s => s.ok).length, gesamt: status.length};
    } catch (err) { return null; }
  }

  function weiterKachel(laufend){
    return h("section", {class: "bn-k akzent tr-weiter"},
      h("header", {class: "tr-weiter-kopf"},
        h("span", {class: "bn-kicker"}, "Weiterlernen"),
        h("span", {class: "tr-weiter-zahl"}, laufend.length === 1 ? "1 offener Durchgang" : `${laufend.length} offene Durchgänge`)),
      laufend.map(e => {
        const fortschritt = zielFortschritt(e);
        const meta = [e.skillName, `ca. ${e.minuten} min`,
          fortschritt ? `${fortschritt.fertig} von ${fortschritt.gesamt} Zielen` : `Versuch ${e.stand.versucht + 1}`];
        return h("div", {class: "tr-weiter-zeile"},
          h("div", {class: "tr-weiter-text"},
            h("strong", {class: "tr-weiter-titel"}, e.titel),
            h("p", {class: "tr-weiter-meta"}, meta.join(" · "))),
          h("div", {class: "tr-knoepfe"},
            h("button", {type: "button", class: "knopf primaer", onclick: () => weiter(e.laeuft)}, "Fortsetzen"),
            h("button", {type: "button", class: "knopf", onclick: () => abnehmen(e.laeuft)}, "Abnehmen"),
            h("button", {type: "button", class: "knopf geist", onclick: () => starten(e.id)}, "Neu starten")));
      }));
  }

  /* ---------- Lernpfade ---------- */
  function pfadeBauen(liste){
    const gruppen = new Map(PFADE.map(p => [p.id, {pfad: p, karten: []}]));
    const rest = {pfad: REST, karten: []};
    for (const e of liste) {
      const p = PFAD_VON.get(e.skill);
      (p ? gruppen.get(p.id) : rest).karten.push(e);
    }
    /* Je Pfad die Fertigkeiten in Lernreihenfolge; Array.sort ist stabil, gleiche Fertigkeit bleibt in Datenreihenfolge. */
    for (const g of gruppen.values()) g.karten.sort((a, b) => (SKILL_RANG.get(a.skill) ?? 99) - (SKILL_RANG.get(b.skill) ?? 99));
    return [...gruppen.values(), rest].filter(g => g.karten.length);
  }

  function pfad(gruppe){
    const fertig = gruppe.karten.filter(bestanden).length;
    const anzahl = gruppe.karten.length;
    const naechster = naechsterKarte(gruppe.karten);
    return h("section", {class: "tr-pfad"},
      h("header", {class: "tr-pfad-kopf"},
        h("h3", {class: "tr-pfad-titel"}, gruppe.pfad.name),
        /* Zahl und Balken gehören zusammen: derselbe Stand, einmal als Text, einmal als Fläche. */
        h("span", {class: "tr-pfad-stand"},
          h("span", {class: "tr-pfad-meta"}, `${fertig} von ${anzahl} bestanden`),
          h("span", {class: "tr-pfad-balken", "aria-hidden": "true", style: {"--tr-p": Math.round(fertig / anzahl * 100)}}))),
      h("div", {class: "tr-pfad-raster"}, gruppe.karten.map(e => karte(e, !!naechster && e.id === naechster.id))));
  }

  /* Nächster Schritt eines Lernpfads: die erste nicht bestandene, startbare und empfohlene Karte in
     Lernreihenfolge. Ist keine empfohlene offen, die erste nicht bestandene startbare; ist alles
     bestanden, gibt es keinen nächsten Schritt. Reine Ableitung aus stand/offen/empfohlen – nichts geraten. */
  function naechsterKarte(karten){
    const startbar = karten.filter(e => !bestanden(e) && e.offen);
    return startbar.find(e => e.empfohlen) || startbar[0] || null;
  }

  /* ---------- Eine kompakte Szenariokarte ---------- */
  function karte(e, istNaechster){
    const laeuft = !!e.laeuft;
    const versucht = e.stand.versucht;
    const klassen = ["tr-karte", "bn-k", "tr-art-" + e.art];
    if (bestanden(e)) klassen.push("tr-fertig");
    if (e.empfohlen) klassen.push("tr-empfohlen");
    if (!bestanden(e)) klassen.push("tr-noch-offen");
    /* Der empfohlene nächste Schritt je Lernpfad trägt die eine Hauptaktion – nicht jede Karte. */
    if (istNaechster) klassen.push("tr-naechster");
    const stand = !versucht ? "noch nicht geübt"
      : !e.stand.bestanden ? `${versucht}× geübt · noch nicht bestanden`
      : `${versucht}× geübt · ${e.stand.bestanden}× bestanden`;
    return h("article", {class: klassen.join(" ")},
      h("header", {class: "tr-karte-kopf"},
        h("div", {class: "tr-marken"},
          h("span", {class: "tr-marke"}, ART[e.art] || e.art),
          istNaechster ? h("span", {class: "tr-schritt"}, "Nächster Schritt") : null),
        e.stand.sterne > 0 ? h("span", {class: "tr-sterne", title: "bestes Ergebnis"}, sterneText(e.stand.sterne)) : null),
      h("h4", {class: "tr-titel"}, e.titel),
      h("p", {class: "tr-meta"}, `${e.skillName} · ca. ${e.minuten} min · ${geraetText(e.geraet)}`),
      /* Weniger Fließtext: sichtbar zwei Zeilen, der ganze Satz bleibt im DOM und im title. */
      h("p", {class: "tr-text", title: e.beschreibung}, e.beschreibung),
      h("p", {class: "tr-stand-zeile"}, stand),
      !e.empfohlen ? h("p", {class: "tr-hinweis"}, `Im Postfach ab Karriere-Stufe ${e.karriereStufe} · üben frei`) : null,
      e.hilfen ? geruest(e.hilfen) : null,
      h("p", {class: "tr-quelle", title: "Quelle: " + e.quelle}, "Quelle: " + e.quelle),
      knoepfe(e, laeuft, istNaechster));
  }

  function knoepfe(e, laeuft, istNaechster){
    const klasse = "knopf" + (istNaechster ? " primaer" : "");
    return h("div", {class: "tr-knoepfe"},
      laeuft ? h("button", {type: "button", class: klasse, onclick: () => weiter(e.laeuft)}, "Fortsetzen") : null,
      laeuft ? h("button", {type: "button", class: "knopf", onclick: () => abnehmen(e.laeuft)}, "Abnehmen") : null,
      laeuft ? h("button", {type: "button", class: "knopf geist", onclick: () => starten(e.id)}, "Neu starten") : null,
      !laeuft ? h("button", {type: "button", class: klasse, disabled: !e.offen, title: e.grund || "", onclick: () => starten(e.id)}, `Starten (${e.minuten} min)`) : null,
      !laeuft && !e.offen ? h("span", {class: "tr-grund"}, e.grund) : null);
  }

  /* Gerüst: der geführte Weg für azubi/azubi-plus mit Schritten (DATEN.trainings), Werkzeug, Denkanstoß
     und der Fehlersuche-Leiter von unten. Für geselle/meister liefert Spiel.training.liste() hilfen = null. */
  function geruest(hilfen){
    return h("details", {class: "tr-geruest"},
      h("summary", {}, "Gerüst: Schritte, Werkzeug, Denkanstoß"),
      hilfen.schritte.length ? h("ol", {class: "tr-schritte"}, hilfen.schritte.map(s => h("li", {}, s))) : null,
      hilfen.tipp ? h("p", {class: "tr-tipp"}, hilfen.tipp) : null,
      hilfen.werkzeug ? h("p", {class: "tr-werkzeug"}, "Werkzeug: " + hilfen.werkzeug) : null,
      hilfen.leiter.length ? h("ol", {class: "tr-leiter"}, hilfen.leiter.map(s =>
        h("li", {}, h("b", {}, s.titel), h("span", {}, " – " + s.frage)))) : null);
  }

  /* ---------- Zeichnen ---------- */
  function ansicht(c){ if (c) flaeche = c; if (flaeche) flaeche.replaceChildren(seite()); }

  function seite(){
    const liste = Spiel.training.liste();
    const laufend = liste.filter(e => e.laeuft);
    filterKnoepfe = [];
    wurzel = h("div", {class: "tr-seite"},
      kopf(liste),
      filterleiste(liste),
      letztes ? ergebnisKarte() : null,
      laufend.length ? weiterKachel(laufend) : null,
      h("div", {class: "tr-liste"}, pfadeBauen(liste).map(pfad)),
      querZeile());
    filterAnwenden();
    return wurzel;
  }

  /* Querverweis zur Abteilung „Subnetting" (Runde 8): Sie ist der Ort, an dem Subnetting/VLAN
     verstanden und in eigenen Runden geübt werden. Der Verweis steht bewusst AM ENDE der Liste:
     oben würde er die erste Trainingskarte um eine Zeile nach unten schieben (gemessen im
     Rauchtest bei 720 px: „Hauptaktion außerhalb"). Ruhige Zeile, eine Hauptaktion, kein
     eigener Zustand. */
  function querZeile(){
    return h("div", {class: "tr-quer"},
      h("button", {type: "button", class: "knopf tr-quer-knopf", onclick: () => UI.app.ansicht("subnetz")},
        "Zur Abteilung Subnetting"),
      h("span", {class: "tr-quer-text"}, "Subnetting und VLAN: vom Bit bis zum Adressplan — verstehen, ausprobieren, in eigenen Runden sichern."));
  }

  /* Fehlschläge JE FERTIGKEIT: `Spiel.fehlschlaege` liefert {skill, text} – die kurze Aufzählung von
     vorher sagte nicht, woran es lag, und welches Thema dahintersteckt. (Review Lernwirkung, P2-5) */
  function fehlerGruppen(abnahme){
    let liste = [];
    try { liste = typeof Spiel.fehlschlaege === "function" ? (Spiel.fehlschlaege(abnahme) || []) : []; }
    catch (e) { liste = []; }
    const gruppen = [];
    for (const f of liste) {
      const id = String(f.skill || "");
      let g = gruppen.find(x => x.id === id);
      if (!g) { g = {id, name: skillName(id), gruende: []}; gruppen.push(g); }
      if (f.text) g.gruende.push(f.text);
    }
    return gruppen.filter(g => g.gruende.length);
  }
  function skillName(id){
    try {
      if (typeof Spiel.skill === "function") { const s = Spiel.skill(id); if (s && s.name) return String(s.name); }
    } catch (e) { /* Rückfall unten */ }
    return String(id || "Fertigkeit").replace(/^lab\./, "");
  }

  /* Ergebnis des letzten Durchgangs: erst hier wird der Lernstand sichtbar, den das Training bewegt hat.
     Aufbau und Klassen bleiben (Tests hängen daran) – ruhiger wird die Karte über das CSS. */
  function ergebnisKarte(){
    const r = letztes, ab = r.abnahme || {}, niveau = ab.niveau || "E";
    const offen = (ab.ergebnisse || []).filter(e => e.ok === false);
    const gruppen = r.bestanden ? [] : fehlerGruppen(ab);
    return h("section", {class: "tr-ergebnis bn-k" + (r.bestanden ? " tr-gut" : "")},
      h("h3", {}, r.bestanden ? `Bestanden – ${sterneText(r.sterne)}` : `Noch nicht bestanden: ${r.titel}`),
      h("p", {class: "sp-leise"}, `„${r.titel}“ · Versuch ${r.versuch} · ` + (r.bestanden
        ? "der Durchgang ist abgeschlossen, der Lernstand steht unten."
        : "der Durchgang bleibt offen – reparieren und noch einmal abnehmen.")),
      /* Erklärung je offenem Ziel – derselbe Weg wie im normalen Ergebnisbildschirm (src/ui/spiel.js:455):
         Kurztitel plus „Erklär mir das" in der Tiefe des eigenen Niveaus. Ohne Lehrtext bleibt es beim Titel. */
      !r.bestanden && offen.length ? h("ul", {class: "tr-offen"}, offen.map(e =>
        h("li", {}, h("b", {}, e.ziel.text || e.ziel.typ),
          e.grund ? h("p", {class: "tr-grund"}, Spiel.grundTitel(e.grund)) : h("p", {}, e.text || ""),
          e.grund && niveau !== "AP2" ? UI.erklaeren(e.grund, niveau) : null))) : null,
      /* Die Gründe gruppiert nach Fertigkeit: ein Trainingsfehlversuch ist so lehrreich wie ein
         fehlgeschlagener Kundenauftrag – er kostet ja nichts (Vertrag § 6). */
      gruppen.length ? h("details", {class: "tr-fehler", open: true},
        h("summary", {}, `Was schiefging – ${gruppen.length} ${gruppen.length === 1 ? "Fertigkeit" : "Fertigkeiten"}`),
        gruppen.map(g => h("section", {class: "tr-fehler-gruppe", "data-skill": g.id},
          h("h4", {}, g.name),
          h("ul", {class: "tr-fehler-liste"}, g.gruende.map(t => h("li", {}, t)))))) : null,
      r.lernen.length ? h("ul", {class: "tr-lernen"}, r.lernen.map(l =>
        h("li", {}, h("b", {}, l.name + ": "), `Lernstand ${l.vorher} → ${l.nachher} (${l.stufe})`))) : null,
      h("p", {class: "sp-leise"}, "Training zahlt kein Geld und keinen Ruf – es zählt nur für den Lernstand."),
      h("div", {class: "tr-knoepfe"},
        h("button", {type: "button", class: "knopf geist", onclick: () => { letztes = null; UI.app.ansicht("lernstand"); }}, "Zum Lernstand")));
  }

  /* ---------- Handlungen ---------- */
  function starten(id){
    const r = Spiel.training.starten(id);
    if (!r.ok) { UI.toast(r.grund, "warn", {titel: "Training"}); return; }
    letztes = null;
    UI.spiel.oeffnen(r.iid);                    /* echter Weg: Labor, Terminal, Hilfeleiter, Auftragsmappe */
  }
  function weiter(iid){ UI.spiel.oeffnen(iid); }

  function abnehmen(iid){
    const inst = Spiel.instanz(iid);
    if (!inst) { UI.toast("Dieser Durchgang ist nicht mehr da.", "warn", {titel: "Training"}); ansicht(); return; }
    const ab = Spiel.abnahme(inst);              /* echter Prüflauf: rechnet nur, zahlt nichts */
    const r = Spiel.training.abnehmen(iid, ab);
    if (!r.ok) { UI.toast(r.grund, "warn", {titel: "Training"}); return; }
    const def = Spiel.TRAINING.find(t => t.id === r.training) || r.def || {};
    letztes = {bestanden: r.bestanden, sterne: r.sterne, lernen: r.lernen || [], abnahme: r.abnahme, versuch: r.stand.versucht, titel: def.titel || "Training"};
    UI.toast(r.bestanden ? `Bestanden: ${sterneText(r.sterne)} – der Lernstand ist mitgeschrieben.` : "Noch nicht bestanden – der Durchgang bleibt offen.",
      r.bestanden ? "ok" : "info", {titel: "Training"});
    if (r.bestanden) ticketModusBeenden();       /* die Instanz ist weg – das Labor darf nicht in ihr hängen bleiben */
    UI.app.aktualisieren?.();
    ansicht();
  }

  /* Nach dem Bestehen entfernt Spiel.training.abnehmen die Instanz. Das Labor muss den Ticketmodus verlassen,
     sonst hinge dort eine „✓ Abnahme“ für einen Durchgang, den es nicht mehr gibt. UI.spiel bietet dafür
     (noch) keine öffentliche Funktion; _S ist der Zustand, den es selbst nach außen gibt. */
  function ticketModusBeenden(){
    try {
      const S = UI.spiel && UI.spiel._S;
      if (S) { S.inst = null; S.live = null; S.demo = null; S.hilfeOffen = false; }
      UI.labor.auftragNeu?.();
      UI.spiel.status?.();
    } catch (e) { console.error("Training: Labor zurücklassen", e); }
  }

  /* Zähler am Dock-Knopf: angefangene Durchgänge (sie liegen bis zur Abnahme in st.postfach). */
  const offene = () => (Spiel.st.postfach || []).filter(i => i && i.quelle === "training").length;

  /* ---------- Anmeldung (wie ui/karriere.js und ui/hub.js – src/ui/app.js bleibt unberührt) ---------- */
  (UI.startHaken ||= []).push(() => {
    UI.app.registrieren("training", {titel: "Training", symbol: "lernen", zeigen: ansicht, wieder: ansicht, zaehler: offene});
    Bus.an("training", () => { if (UI.app.aktuell === "training") ansicht(); });
  });

  return {ansicht, starten, weiter, abnehmen, get letztes(){ return letztes; }};
})();
