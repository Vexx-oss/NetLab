"use strict";
/* ---------- Trainingsbereich: die Ansicht „training“ (Vertrag § 6, eigenes Präfix tr-) ----------
   Zeigt Spiel.training.liste() als Karten: Szenario, Fertigkeit, Minuten, Art, Stand und Quelle.
   Start und Fortsetzen öffnen den Durchgang im Labor über den bestehenden Weg (UI.spiel.oeffnen) –
   dieselbe Simulation, dieselbe Hilfeleiter, dasselbe Terminal. Abgenommen wird über
   Spiel.training.abnehmen: kein Geld, kein Ruf, kein Postfach (Vertrag § 6).

   Das Gerüst (Leiter, Werkzeug, Tipp) zeigt nur, wessen Bildungsstand es hergibt – die Entscheidung
   fällt in Spiel.training.liste() (Spiel.stufe), hier wird sie nur gezeichnet.

   Angemeldet wird die Ansicht beim Laden über UI.startHaken (wie ui/karriere.js und ui/hub.js);
   src/ui/app.js bleibt unberührt. Der Dock-Knopf erscheint, weil „training“ in der REIHE steht.
   Hinweis: UI.symbol kennt (Stand heute) kein „lernen“ und zeichnet dafür das info-Zeichen. */
UI.training = (() => {
  let flaeche = null, letztes = null;

  const sterneText = s => "★".repeat(Math.floor(s)) + (s % 1 ? "½" : "") + "☆".repeat(Math.max(0, 5 - Math.ceil(s)));
  const ART = {basis: "Basis", stoerung: "Störung", pruefung: "Prüfung"};
  const GERAET = {host: "Endgerät", switch: "Switch", router: "Router", server: "Server", firewall: "Firewall", alle: "wechselnde Geräte"};
  const geraetText = g => !g ? "kein Fall im Training" : (GERAET[g] || g);

  /* ---------- Zeichnen ---------- */
  function ansicht(c){ if (c) flaeche = c; if (flaeche) flaeche.replaceChildren(seite()); }

  function seite(){
    const liste = Spiel.training.liste();
    const bestanden = liste.filter(e => e.stand.bestanden > 0).length;
    const versuche = liste.reduce((s, e) => s + e.stand.versucht, 0);
    const gefuehrt = liste.length ? liste[0].gefuehrt : false;
    const stufe = liste.length ? liste[0].stufe : "azubi";
    return h("div", {class: "tr-seite"},
      h("header", {class: "tr-kopf"},
        h("h2", {}, "Training"),
        h("p", {class: "sp-leise"}, "Üben abseits der Aufträge: kein Lohn, kein Ruf, kein Postfach. Was du hier schaffst, zählt für deinen Lernstand."),
        /* „Bildungsstand" statt „Stufe": sonst stehen im selben Fenster zwei verschiedene „Stufen"
           (Kopfzeile = Karriere, hier = Bildungsstand). Review Auffindbarkeit, Befund 4. */
        h("p", {class: "tr-summe"}, `${bestanden} von ${liste.length} Szenarien bestanden · ${versuche} ${versuche === 1 ? "Durchgang" : "Durchgänge"} · Bildungsstand ${stufe}`,
          gefuehrt ? " – geführte Simulation" : " – Liste ohne Gerüst")),
      letztes ? ergebnisKarte() : null,
      h("div", {class: "tr-liste"}, liste.map(karte)));
  }

  function karte(e){
    const laeuft = !!e.laeuft;
    return h("article", {class: "tr-karte tr-" + e.art + (e.stand.bestanden ? " tr-fertig" : "")},
      h("header", {class: "tr-kopf-zeile"},
        h("h3", {}, e.titel),
        h("span", {class: "tr-marke"}, ART[e.art] || e.art)),
      h("p", {class: "tr-text"}, e.beschreibung),
      h("p", {class: "tr-meta"}, `${e.skillName} · ca. ${e.minuten} min · ${geraetText(e.geraet)}`),
      h("p", {class: "tr-stand-zeile"}, e.stand.versucht
        ? `${e.stand.versucht}× geübt, ${e.stand.bestanden}× bestanden${e.stand.sterne ? " · bestes " + sterneText(e.stand.sterne) : ""}`
        : "noch nicht geübt"),
      !e.empfohlen ? h("p", {class: "sp-leise"}, `Im Postfach kommt das ab Karriere-Stufe ${e.karriereStufe} – üben darfst du es jetzt schon.`) : null,
      e.hilfen ? geruest(e.hilfen) : null,
      h("p", {class: "tr-quelle"}, "Quelle: " + e.quelle),
      h("div", {class: "tr-knoepfe"},
        laeuft ? h("button", {type: "button", class: "knopf primaer", onclick: () => weiter(e.laeuft)}, "Fortsetzen") : null,
        laeuft ? h("button", {type: "button", class: "knopf", onclick: () => abnehmen(e.laeuft)}, "Abnehmen") : null,
        laeuft ? h("button", {type: "button", class: "knopf geist", onclick: () => starten(e.id)}, "Neu starten") : null,
        !laeuft ? h("button", {type: "button", class: "knopf primaer", disabled: !e.offen, title: e.grund || "", onclick: () => starten(e.id)}, `Starten (${e.minuten} min)`) : null,
        !laeuft && !e.offen ? h("span", {class: "tr-grund"}, e.grund) : null));
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

  /* Ergebnis des letzten Durchgangs: erst hier wird der Lernstand sichtbar, den das Training bewegt hat. */
  function ergebnisKarte(){
    const r = letztes, ab = r.abnahme || {}, niveau = ab.niveau || "E";
    const offen = (ab.ergebnisse || []).filter(e => e.ok === false);
    const gruppen = r.bestanden ? [] : fehlerGruppen(ab);
    return h("section", {class: "tr-ergebnis" + (r.bestanden ? " tr-gut" : "")},
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
