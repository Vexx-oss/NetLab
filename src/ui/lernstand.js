"use strict";
/* ---------- Lernstand: Ausbildungs-Cockpit (Runde 4, Strang B) ----------
   Aus src/ui/karriere.js ausgelagert (Phase 0) und danach nach dem Gestaltungsvertrag
   „Entwurf – Runde 4" § 3 Strang B neu gebaut:
     · Kopf mit Mikrolabel AUSBILDUNG · ÜBERBLICK, Titel, Kontextzeile; rechts die Prüfungsreife-Kachel
       (Ruf, Können, Prüfungstag – echte Werte, keine Prognose) und „Auswertung kopieren" als Geist-Knopf.
     · „Nächster Schritt" prominent: der Baustein src/ui/naechster.js beantwortet „was jetzt?" mit
       genau EINER Hauptaktion.
     · Kompetenzkarte als Register über die sechs Regionen: Zustand als Text UND Form (kk-*).
     · Fehlerheft als Register mit echtem Fehlertext, Datum und Üben-Knopf (Spiel.karriere.training).
     · „Behalten" als ruhige Messkachel mit ehrlichen „–", wo nichts gemessen ist.
     · Training-Empfehlungen (was danach dran ist), Prüfungstag, Abzeichen und Fehlerdex ruhig integriert.
   Alles kommt aus vorhandenen Daten (Spiel.stufeInfo, Spiel.pruefung, Spiel.abzeichen, Spiel.kompetenz,
   L.serie/L.heuteZahl/L.behalten/L.st.fehler). Keine neuen Spielzustände, keine erfundenen Zahlen.
   Die Logikschicht (src/spiel/karriere.js, stufensystem.js, lernen.js) wird nur gelesen.
   Der Abschnitt „Hilfe und Übung" kommt unverändert aus src/ui/lernstand-hilfe.js und hängt sich
   hinter dieser Ansicht ein. Gemeinsame Helfer (overlay) kommen aus UI.karriere._helfer. */
UI.lernstand = (() => {
  const H = UI.karriere._helfer;
  const MAX_FEHLER = 8;                 /* so viele Fehlerheft-Zeilen zeigt das Register (wie bisher) */
  const LABOR = id => String(id).startsWith("lab.");

  /* ---------- Der bestehende Übungsweg: Mini-Ticket oder Auftrag (unverändert) ---------- */
  function training(skill){
    const r = Spiel.karriere.training(skill);
    if (r.art === "mini") { UI.toast("Ein Mini-Ticket wartet in der Leiste – oder direkt hier.", "info", {aktion: {text: "Jetzt lösen", fn: () => UI.karriere.miniDialog()}}); }
    else if (r.art === "ticket") { UI.spiel.oeffnen(r.inst.iid); }
    else UI.toast(r.grund, "info");
  }

  /* ---------- Leser: jede Angabe aus echten Daten, jeder Rückfall ehrlich ---------- */
  const motor = () => { try { return typeof L !== "undefined" && L ? L : null; } catch (e) { return null; } };
  const spielstand = () => { try { return (typeof Spiel !== "undefined" && Spiel && Spiel.st) || {}; } catch (e) { return {}; } };
  function stufeInfo(){ try { return Spiel.stufeInfo ? Spiel.stufeInfo() : null; } catch (e) { return null; } }
  function aktivePruefung(){ try { return Spiel.pruefung && Spiel.pruefung.aktiv ? Spiel.pruefung.aktiv() : null; } catch (e) { return null; } }
  function zahlen(fn, rueckfall){
    try { const w = fn(); const n = Number(w); return Number.isFinite(n) ? n : rueckfall; } catch (e) { return rueckfall; }
  }
  const serie = () => { const M = motor(); return M && typeof M.serie === "function" ? zahlen(() => M.serie(), 0) : 0; };
  const heuteUebungen = () => { const M = motor(); return M && typeof M.heuteZahl === "function" ? zahlen(() => M.heuteZahl(), 0) : 0; };
  const faelligeZahl = () => { const M = motor(); return M && typeof M.faelligeIds === "function" ? zahlen(() => M.faelligeIds(LABOR).length, 0) : 0; };
  function skillName(id){
    try {
      if (typeof Spiel !== "undefined" && Spiel.karriere && typeof Spiel.karriere.skillName === "function") {
        const n = Spiel.karriere.skillName(id);
        if (n && n !== id) return String(n);
      }
    } catch (e) { /* Rückfall unten */ }
    return String(id == null ? "" : id).replace(/^lab\./, "");
  }
  function behaltenWerte(){
    const M = motor();
    if (!M || typeof M.behalten !== "function") return null;
    try {
      const b = M.behalten();
      return b && b["1"] && b["3"] && b["7"] ? b : null;
    } catch (e) { return null; }
  }

  /* ---------- Kopf: Mikrolabel, Titel, Kontextzeile; rechts die Prüfungsreife ---------- */
  function kopf(){
    const i = stufeInfo(), s = spielstand();
    const teile = [];
    if (i) teile.push("Stufe " + i.stufe + " · " + i.name);
    else teile.push("Karriere nicht geladen");
    teile.push("Ruf " + zahlDe(Number(s.ruf) || 0));
    const n = serie();
    teile.push("Serie: " + n + (n === 1 ? " Tag" : " Tage"));
    const uebungen = heuteUebungen();
    teile.push("heute " + uebungen + (uebungen === 1 ? " Übung" : " Übungen"));
    const f = faelligeZahl();
    if (f) teile.push(f === 1 ? "1 Wiederholung fällig" : f + " Wiederholungen fällig");
    return h("header", {class: "kr-kopf lern-kopf"},
      h("div", {class: "lern-kopf-text"},
        h("span", {class: "bn-kicker"}, "Ausbildung · Überblick"),
        h("h2", {}, "Lernstand"),
        h("p", {class: "bn-lead lern-kontext"}, teile.join(" · ")),
        h("div", {class: "lern-kopf-aktionen"},
          h("button", {type: "button", class: "knopf klein geist lern-kopieren", title: "Spieltagebuch: kurze Auswertung zum Einfügen in einen Chat", onclick: () => auswertungKopieren()}, UI.symbol("auswertung", 16), " Auswertung kopieren"))),
      pruefungsreife());
  }

  function reifeZeile(z){
    return [h("dt", {class: "lern-reife-label"}, z.label),
      h("dd", {class: "lern-reife-stand" + (z.ok ? " ok" : "")}, (z.ok ? "✓ " : "") + z.wert)];
  }
  function pruefungsreife(){
    const i = stufeInfo(), s = spielstand(), p = aktivePruefung();
    const zert = Array.isArray(s.zertifikate) ? s.zertifikate.filter(z => z && z.art) : [];
    const zertArten = zert.map(z => z.art);
    const rufZeile = i
      ? {label: "Ruf", wert: (Number(i.ruf.ist) || 0) + " / " + (i.ruf.soll == null ? "–" : i.ruf.soll), ok: !!i.ruf.ok}
      : {label: "Ruf", wert: String(Number(s.ruf) || 0), ok: false};
    const koennenZeile = i
      ? {label: "Können Stufe " + i.stufe, wert: i.koennen.summe + " / " + i.koennen.sollSumme, ok: !!i.koennen.ok}
      : null;
    const pruefungZeile = {
      label: "Prüfungstag",
      wert: p ? "läuft: " + p.art : zertArten.length ? "bestanden: " + zertArten.join(", ") : "noch nicht abgelegt",
      ok: !p && zertArten.length > 0,
    };
    let status = "Karriere nicht geladen", ton = "";
    if (p) { status = "Prüfung " + p.art + " läuft"; ton = "warn"; }
    else if (i && i.bereit && i.naechste) { status = "Bereit für Stufe " + i.naechste.nr; ton = "ok"; }
    else if (i && i.max) { status = "Höchste Stufe erreicht"; ton = "ok"; }
    else if (i && i.naechste) { status = "Noch nicht bereit für Stufe " + i.naechste.nr; }
    const zeilen = [rufZeile, koennenZeile, pruefungZeile].filter(Boolean).flatMap(reifeZeile);
    return h("section", {class: "bn-k lern-reife", "aria-label": "Prüfungsreife"},
      h("span", {class: "bn-kicker"}, "Prüfungsreife"),
      h("p", {class: "lern-reife-wert" + (ton ? " " + ton : "")}, status),
      h("dl", {class: "lern-reife-zeilen"}, zeilen),
      h("p", {class: "bn-meta lern-reife-hinweis"}, "Der Aufstieg braucht Ruf und Können; der Prüfungstag ist freiwillig."));
  }
  function auswertungKopieren(){
    try {
      if (typeof UI !== "undefined" && UI.hub && typeof UI.hub.tagebuchKopieren === "function") { UI.hub.tagebuchKopieren(); return; }
    } catch (e) { console.error("Lernstand: Auswertung", e); }
    try { if (typeof UI !== "undefined" && typeof UI.toast === "function") UI.toast("Die Auswertung steht in den Einstellungen unter Spieltagebuch.", "info"); } catch (e) { /* nichts */ }
  }

  /* ---------- Kompetenzkarte (E2, Hebel 11a; Präfix kk-) ----------
     Register über die sechs Regionen. Der Zustand steht als Text (kk-stufe) UND als Form (kk-form);
     Farbe allein trägt keine Information. Der Nebel bleibt Nebel, das „?" bleibt stehen. */
  const KK_KLASSE = {nebel: "kk-nebel", offen: "kk-offen", angefangen: "kk-angefangen", gesehen: "kk-gesehen", "geübt": "kk-geuebt", sicher: "kk-sicher", gemeistert: "kk-gemeistert", "gemeistert ★": "kk-gemeistert kk-stern"};
  const KK_TEXT = {nebel: "im Nebel", offen: "neu", angefangen: "angefangen", gesehen: "gesehen", "geübt": "geübt", sicher: "sicher", gemeistert: "gemeistert", "gemeistert ★": "gemeistert ★"};
  function kompetenzkarte(){
    const k = Spiel.kompetenz.karte(), s = spielstand();
    const stufeJetzt = Number(s.stufe) || 1;
    const faellig = id => typeof L !== "undefined" && L.istFaellig(id);
    const regionen = k.regionen.map((r, i) => {
      const geuebt = r.felder.filter(f => f.zustand !== "nebel" && f.zustand !== "offen").length;
      return h("section", {class: "kk-region", "data-region": r.id},
        h("header", {class: "kk-region-kopf"},
          h("span", {class: "kk-region-nr", "aria-hidden": "true"}, ("0" + (i + 1)).slice(-2)),
          h("h4", {}, r.titel),
          h("span", {class: "kk-region-stand"}, geuebt + " von " + r.felder.length + " geübt")),
        h("div", {class: "kk-felder"}, r.felder.map(f => {
          const fällig = faellig(f.id);
          const zustand = fällig ? "fällig" : f.zustand === "nebel" ? "nebel" : f.zustand;
          const text = f.zustand === "nebel" ? "im Nebel" : fällig ? "fällig" : KK_TEXT[f.zustand] || f.zustand;
          const klasse = KK_KLASSE[f.zustand] || "kk-offen";
          return h("button", {type: "button", class: "kk-feld " + klasse + (fällig ? " kk-faellig" : ""), "data-skill": f.id, "data-zustand": zustand,
            "aria-label": (f.zustand === "nebel" ? "Im Nebel: " + (f.name || f.id) : f.name + ": " + text + (fällig ? " – Wiederholung fällig" : "")),
            title: f.zustand === "nebel" ? "Noch im Nebel – übe ein Nachbarfeld oder steig eine Stufe auf." : f.name + ": " + text + (fällig ? " – fällig" : ""),
            onclick: e => feldMenue(e, f, s)},
            h("span", {class: "kk-form", "aria-hidden": "true"}),
            h("span", {class: "kk-name"}, f.zustand === "nebel" ? "?" : f.name),
            h("small", {class: "kk-stufe"}, text));
        })));
    });
    const legende = ["offen", "angefangen", "gesehen", "geübt", "sicher", "gemeistert", "gemeistert ★", "fällig"].map(z => {
      const klasse = z === "fällig" ? "kk-offen kk-faellig" : KK_KLASSE[z] || "kk-offen";
      return h("span", {class: "kk-legende-punkt"},
        h("span", {class: "kk-form " + klasse, "aria-hidden": "true"}),
        z === "fällig" ? "fällig" : KK_TEXT[z] || z);
    });
    return h("section", {class: "kk-karte bn-k lern-voll"},
      h("header", {class: "kk-kopf"},
        h("div", {},
          h("span", {class: "bn-kicker"}, "Kompetenzfelder"),
          h("h3", {class: "bn-titel"}, "Kompetenzkarte")),
        h("p", {class: "bn-meta kk-stand"}, k.sichtbar + " von " + k.gesamt + " Feldern sichtbar – der Nebel lichtet sich durch Üben und neue Stufen. Bildungsstand: Stufe " + stufeJetzt + ".")),
      h("div", {class: "kk-regionen"}, regionen),
      h("div", {class: "kk-legende"},
        h("span", {class: "kk-legende-titel"}, "Zustand"),
        legende));
  }
  /* Menü eines Feldes: Üben (Mini-Ticket oder Auftrag) oder Nachschlagen – bestehende Wege. */
  function feldMenue(e, f, s){
    if (f.zustand === "nebel") { UI.toast("Noch im Nebel – übe ein Nachbarfeld oder steig eine Stufe auf.", "info", {dauer: 2800}); return; }
    const stufeJetzt = Number(s.stufe) || 1;
    const r = e.currentTarget.getBoundingClientRect(), frei = f.stufe <= stufeJetzt;
    UI.menue(r.left, r.bottom + 4, [
      {text: "Üben", sym: "labor", info: frei ? "Mini-Übung oder Auftrag" : "Aufträge ab Stufe " + f.stufe, fn: () => frei ? training(f.id) : UI.toast("Aufträge dazu gibt es ab Stufe " + f.stufe + " – nachschlagen geht schon.", "info", {dauer: 3000})},
      {text: "Nachschlagen", sym: "wiki", fn: () => UI.wiki.oeffnen(f.id)},
    ], {titel: f.name});
  }

  /* ---------- Fehlerheft: echtes Register, ehrlicher Leerzustand ---------- */
  function fehlerListe(){
    const M = motor();
    if (!M || !M.st || !Array.isArray(M.st.fehler)) return null;
    try {
      return M.st.fehler
        .filter(f => f && f.unit && String(f.spiel || "").startsWith("labor"))
        .slice(0, MAX_FEHLER)
        .map(f => ({unit: f.unit, name: skillName(f.unit), text: String(f.text || ""), tag: f.t}));
    } catch (e) { return null; }
  }
  function fehlerheft(){
    const liste = fehlerListe();
    const kopfZeile = h("header", {class: "lern-kachel-kopf"},
      h("span", {class: "bn-kicker"}, "Fehlerheft"),
      h("span", {class: "lern-zahl"}, liste === null ? "Lernmotor fehlt" : liste.length ? liste.length + (liste.length === 1 ? " Eintrag" : " Einträge") : "leer"));
    const inhalt = liste === null
      ? h("div", {class: "bn-leer lern-fehler-leer"}, "Der Lernmotor ist in dieser Fassung nicht geladen – das Fehlerheft bleibt leer.")
      : liste.length
        ? h("ul", {class: "lern-fehler-liste"}, liste.map(f => h("li", {class: "lern-fehler-zeile", "data-skill": f.unit},
            h("div", {class: "lern-fehler-text"},
              h("b", {class: "lern-fehler-name"}, f.name),
              h("span", {class: "lern-fehler-was"}, f.text),
              h("small", {class: "lern-fehler-meta"}, "notiert am " + datumDe(f.tag))),
            h("button", {type: "button", class: "knopf klein lern-fehler-ueben", title: "Üben: " + f.name, onclick: () => training(f.unit)}, "Üben"))))
        : h("div", {class: "bn-leer lern-fehler-leer"}, "Noch kein Fehler notiert. Einträge entstehen bei nicht bestandenen Zielen – und sind dann der schnellste Weg zur Übung.");
    return h("section", {class: "bn-k bn-s7 lern-fehler"},
      kopfZeile,
      h("h3", {class: "bn-titel"}, "Was schiefging"),
      h("p", {class: "bn-meta"}, "Je Zeile der echte Fehlertext mit Datum und einem Üben-Knopf – derselbe Weg wie im Training."),
      inhalt);
  }

  /* ---------- Behalten: ruhige Messkachel, ehrliche „–" ---------- */
  function behaltenKachel(){
    const b = behaltenWerte();
    const fenster = [["1", "nach 1–2 Tagen"], ["3", "nach 3–6 Tagen"], ["7", "nach 7+ Tagen"]];
    const quote = k => {
      const z = b && b[k];
      if (!z || !z[1]) return null;
      return Math.round(100 * Number(z[0]) / Number(z[1]));
    };
    const gesamt = b ? [b["1"], b["3"], b["7"]].reduce((n, z) => n + (Number(z && z[1]) || 0), 0) : 0;
    const zeilen = fenster.map(([k, label]) => {
      const p = quote(k);
      return h("div", {class: "lern-quote", "data-fenster": k},
        h("span", {class: "lern-quote-label"}, label),
        h("b", {class: "lern-quote-wert"}, p == null ? "–" : p + " %"),
        h("small", {class: "lern-quote-meta"}, b && b[k] && b[k][1] ? zahlDe(b[k][0]) + " von " + zahlDe(b[k][1]) + " richtig" : "keine Messung"),
        p == null ? null : h("span", {class: "lern-quote-bar", "aria-hidden": "true"}, h("i", {style: {width: p + "%"}})));
    });
    return h("section", {class: "bn-k bn-s5 lern-behalten"},
      h("header", {class: "lern-kachel-kopf"},
        h("span", {class: "bn-kicker"}, "Behalten"),
        h("span", {class: "lern-zahl"}, gesamt ? zahlDe(gesamt) + (gesamt === 1 ? " Messung" : " Messungen") : "keine Messung")),
      h("h3", {class: "bn-titel"}, "Trefferquote"),
      h("p", {class: "bn-meta"}, "Gemessen bei fälligen Wiederholungen. Ohne Messung steht hier ein –, keine geschätzte Zahl."),
      h("div", {class: "lern-quote-liste"}, zeilen));
  }

  /* ---------- Training: was nach dem nächsten Schritt dran ist (fällig/wackelig) ---------- */
  function trainingKachel(){
    const E = typeof UI !== "undefined" && UI.naechster ? UI.naechster : null;
    let liste = [], faellig = 0, wackelt = 0;
    if (E) {
      /* Die Kachel heißt „Danach": der nächste Schritt steht oben, hier steht, was danach dran ist. */
      let ohne = null;
      try { const s = E.schritt(); if (s && s.aktion && s.aktion.art === "ueben" && s.skill) ohne = s.skill; } catch (e) { ohne = null; }
      try { liste = E.empfehlungen(3, ohne); } catch (e) { liste = []; }
      try { faellig = E.faelligeIds().length; wackelt = E.schwacheIds().length; } catch (e) { /* bleibt 0 */ }
    }
    const leerText = !E
      ? "Der Empfehlungs-Baustein ist in dieser Fassung nicht geladen."
      : !faellig && !wackelt
        ? "Nichts fällig, nichts wackelt – gute Zeit für ein Ticket aus dem Postfach."
        : "Mehr ist gerade nicht dran – der nächste Schritt steht oben.";
    return h("section", {class: "bn-k bn-s5 lern-training"},
      h("header", {class: "lern-kachel-kopf"},
        h("span", {class: "bn-kicker"}, "Training"),
        h("span", {class: "lern-zahl"}, E ? faellig + " fällig · " + wackelt + " wackelt" : "nicht geladen")),
      h("h3", {class: "bn-titel"}, "Danach dran"),
      h("p", {class: "bn-meta"}, "Fällige Wiederholungen und wackelige Fertigkeiten – je Zeile der bestehende Übungsweg."),
      liste.length
        ? h("ul", {class: "lern-empfehlungen"}, liste.map(e => h("li", {class: "lern-empfehlung", "data-skill": e.id},
            h("div", {class: "lern-empfehlung-text"},
              h("b", {}, e.name),
              h("small", {class: "lern-empfehlung-grund"}, e.grund)),
            h("button", {type: "button", class: "knopf klein geist lern-empfehlung-ueben", title: "Üben: " + e.name, onclick: () => training(e.id)}, "Üben"))))
        : h("p", {class: "bn-meta lern-training-leer"}, leerText),
      h("div", {class: "lern-kachel-fuss"},
        h("button", {type: "button", class: "knopf geist klein lern-training-oeffnen", onclick: () => { if (UI.app && typeof UI.app.ansicht === "function") UI.app.ansicht("training"); }}, "Trainingsbereich öffnen")));
  }

  /* ---------- Prüfungstag ---------- */
  function gebuehrText(art){
    const s = spielstand();
    const zert = Array.isArray(s.zertifikate) ? s.zertifikate : [];
    const verlauf = Array.isArray(s.pruefungen) ? s.pruefungen : [];
    const erste = !zert.length && !verlauf.length;
    const betrag = Spiel.PRUEFUNG && Spiel.PRUEFUNG.GEBUEHR ? (Number(Spiel.PRUEFUNG.GEBUEHR[art]) || 0) : 0;
    return erste ? "gebührenfrei" : betrag + " €";
  }
  function pruefungKachel(){
    const p = aktivePruefung(), s = spielstand();
    const P = typeof Spiel !== "undefined" && Spiel.PRUEFUNG ? Spiel.PRUEFUNG : null;
    const zert = Array.isArray(s.zertifikate) ? s.zertifikate.filter(z => z && z.art) : [];
    const verlauf = Array.isArray(s.pruefungen) ? s.pruefungen : [];
    const meta = P
      ? P.AUFGABEN + " Aufgaben, " + P.MINUTEN + " Minuten, keine Hilfe – Note nach IHK-Punkteschlüssel. Die erste Prüfung ist gebührenfrei."
      : "Keine Hilfe, Note nach IHK-Punkteschlüssel. Die erste Prüfung ist gebührenfrei.";
    return h("section", {class: "bn-k bn-s5 lern-pruefung"},
      h("header", {class: "lern-kachel-kopf"},
        h("span", {class: "bn-kicker"}, "Zertifizierung"),
        h("span", {class: "lern-zahl"}, p ? "läuft" : zert.length ? zert.length + " bestanden" : "offen")),
      h("h3", {class: "bn-titel"}, "Prüfungstag"),
      h("p", {class: "bn-meta"}, meta),
      p
        ? h("div", {class: "lern-pruefung-knoepfe"},
            h("button", {type: "button", class: "knopf lern-pruefung-oeffnen", onclick: () => pruefungUebersicht()}, "Laufende Prüfung " + p.art + " öffnen"))
        : h("div", {class: "lern-pruefung-knoepfe"},
            h("button", {type: "button", class: "knopf lern-pruefung-start", onclick: () => pruefungStarten("AP1")}, "Prüfung AP1 starten (" + gebuehrText("AP1") + ")"),
            h("button", {type: "button", class: "knopf geist klein lern-pruefung-start2", onclick: () => pruefungStarten("AP2")}, "AP2 (" + gebuehrText("AP2") + ")")),
      zert.length ? h("div", {class: "kr-zert"}, zert.map(z => h("span", {class: "kr-zertifikat"}, UI.symbol("urkunde", 14), " " + z.art + " · Note " + z.note + " · " + datumDe(z.tag)))) : null,
      verlauf.length ? h("p", {class: "bn-meta lern-pruefung-verlauf"}, "Bisher: " + verlauf.slice(-5).map(x => x.art + " " + x.punkte + " P. (Note " + x.note + ")").join(" · ")) : null);
  }

  /* ---------- Prüfungstag: Ablauf (unverändert; das Overlay schließt weiter mit Escape) ---------- */
  function pruefungStarten(art){
    const r = Spiel.pruefung.starten(art);
    if (!r.ok) { UI.toast(r.grund, "warn"); return; }
    if (r.gebuehrErlassen) UI.toast("Die erste Prüfung ist gebührenfrei. Viel Erfolg!", "info");
    pruefungUebersicht();
  }
  let pruefZu = null;
  function pruefungUebersicht(){
    const p = Spiel.pruefung.aktiv(); if (!p) return;
    pruefZu?.();
    const rest = Spiel.pruefung.restMs(p), mm = Math.floor(rest / 60000), ss = String(Math.floor(rest / 1000) % 60).padStart(2, "0");
    const karte = h("div", {class: "sp-ergebnis"},
      h("h2", {}, "Prüfung " + p.art), h("p", {class: "sp-leise"}, "Restzeit " + mm + ":" + ss + " · Keine Hilfe, keine Live-Ziele. Löse die Aufgaben in beliebiger Reihenfolge."),
      h("ol", {class: "kr-aufgaben"}, p.aufgaben.map((iid, i) => { const inst = Spiel.instanz(iid); const def = inst && Spiel.defVon(inst);
        const kd = Spiel.karriere.kunde(inst.kunde || def.kunde), ziele = (def.ziele || []).length;
        return def ? h("li", {}, h("div", {}, h("b", {}, def.titel), h("p", {class: "sp-leise"}, (kd ? kd.name : "Kunde") + " · " + ziele + " " + (ziele === 1 ? "Ziel" : "Ziele") + " · etwa " + (def.minuten || 5) + " min")),
          h("button", {type: "button", class: "knopf klein", onclick: () => { pruefZu?.(); UI.spiel.oeffnen(iid); }}, "Aufgabe " + (i + 1) + " öffnen")) : null; })),
      h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf primaer", onclick: () => { pruefZu?.(); pruefungAbgeben(); }}, "Prüfung abgeben"),
        h("button", {type: "button", class: "knopf geist", onclick: () => pruefZu?.()}, "Weiterarbeiten")));
    pruefZu = H.overlay(karte);
  }
  function pruefungAbgeben(){
    const e = Spiel.pruefung.abgeben(); if (!e) return;
    const satz = Spiel.karriere.seniorSatz(e.bestanden ? "pruefungBestanden" : "pruefungNichtBestanden");
    UI.sandbox?.laden?.();
    const zu = H.overlay(h("div", {class: "sp-ergebnis"},
      h("h2", {}, e.bestanden ? "Bestanden – Note " + e.note + " (" + Spiel.pruefung.NOTEN[e.note] + ")" : "Nicht bestanden – Note " + e.note),
      h("div", {class: "kr-punkte"}, h("b", {}, e.punkte), h("span", {}, "von 100 Punkten")),
      h("ul", {class: "sp-pruefliste"}, e.teile.map(t => h("li", {class: t.anteil >= 1 ? "ok" : "offen"}, h("span", {}, t.anteil >= 1 ? "✓" : "✗"),
        h("div", {}, h("b", {}, t.titel), h("p", {}, Math.round(t.anteil * 100) + " % · " + (t.gruende.map(g => Spiel.grundTitel(g)).join(", ") || "alles erfüllt")))))),
      h("blockquote", {class: "sp-dank"}, "„" + satz + "“", h("cite", {}, "— der Senior")),
      e.schwach.length ? h("div", {}, h("h3", {}, "Schwachstellen – direkt trainieren"), h("div", {class: "sp-knoepfe"}, e.schwach.map(s => h("button", {type: "button", class: "knopf klein", onclick: () => { zu(); training(s); }}, Spiel.karriere.skillName(s))))) : null,
      h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf primaer", onclick: () => { zu(); UI.app.ansicht("lernstand"); }}, "Zum Lernstand"))));
  }

  /* ---------- Abzeichen: ruhig integriert, ohne Emoji (Zustand als Text + Form) ---------- */
  function abzeichenKachel(){
    let liste = [];
    try {
      if (Spiel.abzeichen && typeof Spiel.abzeichen.pruefen === "function") Spiel.abzeichen.pruefen();
      if (Spiel.abzeichen && typeof Spiel.abzeichen.liste === "function") liste = Spiel.abzeichen.liste() || [];
    } catch (e) { liste = []; }
    const hat = liste.filter(a => a.erhalten).length;
    const erhaltene = liste.filter(a => a.erhalten);
    /* Ruhig integriert: nur die erhaltenen Abzeichen stehen offen als Chip; die vollständige
       Liste steckt in einem zugeklappten Register – sie ist Nachschlagewerk, nicht Tagesgeschäft. */
    return h("section", {class: "bn-k bn-s7 lern-abzeichen"},
      h("header", {class: "lern-kachel-kopf"},
        h("span", {class: "bn-kicker"}, "Abzeichen"),
        h("span", {class: "lern-zahl"}, hat + " von " + liste.length)),
      h("h3", {class: "bn-titel"}, "Arbeitsweise"),
      h("p", {class: "bn-meta"}, "Jedes Abzeichen steht für eine Arbeitsweise, die im Beruf zählt."),
      erhaltene.length
        ? h("div", {class: "lern-abz-chips"}, erhaltene.map(a => h("span", {class: "lern-abz-chip", title: (a.lehrt || "") + " – " + (a.text || "")}, "✓ " + a.titel)))
        : h("p", {class: "bn-meta lern-abz-leer"}, "Noch keins erhalten – das Register zeigt, welche Arbeitsweisen zählen."),
      h("details", {class: "lern-abz-mehr"},
        h("summary", {class: "lern-abz-summary"}, "Alle " + liste.length + " Abzeichen ansehen"),
        h("ul", {class: "lern-abz-liste"}, liste.map(a => h("li", {class: "lern-abz" + (a.erhalten ? " hat" : ""), title: a.lehrt},
          h("span", {class: "lern-abz-mark", "aria-hidden": "true"}, a.erhalten ? "✓" : ""),
          h("span", {class: "lern-abz-text"},
            h("b", {}, a.titel),
            h("small", {}, a.text),
            h("small", {class: "lern-abz-stand"}, a.erhalten ? "erhalten am " + datumDe(heute(new Date(a.erhalten))) : a.soll === 1 ? "noch offen" : zahlDe(a.ist) + " / " + zahlDe(a.soll))))))));
  }

  /* ---------- Fehlerdex: bleibt Baustein des Hubs, hier nur eingeordnet ---------- */
  function dexKachel(){
    let inhalt = null;
    try {
      if (typeof UI !== "undefined" && UI.hub && typeof UI.hub.dexAbschnitt === "function") inhalt = UI.hub.dexAbschnitt();
    } catch (e) { inhalt = null; }
    if (!inhalt) return null;
    return h("section", {class: "bn-k lern-voll lern-dex"}, inhalt);
  }

  /* ---------- Nächster Schritt: Baustein aus src/ui/naechster.js, ein Rückfall ohne ihn ---------- */
  function naechsterKachel(){
    try {
      if (typeof UI !== "undefined" && UI.naechster && typeof UI.naechster.kachel === "function") {
        return UI.naechster.kachel({
          ueben: training,
          pruefung: pruefungUebersicht,
          starten: art => pruefungStarten(art),
          ansicht: name => { if (UI.app && typeof UI.app.ansicht === "function") UI.app.ansicht(name); },
        });
      }
    } catch (e) { console.error("Lernstand: Nächster Schritt", e); }
    return h("section", {class: "nst-kachel bn-k akzent"},
      h("span", {class: "bn-kicker"}, "Nächster Schritt"),
      h("p", {class: "nst-lead"}, "Der Baustein für den nächsten Schritt ist in dieser Fassung nicht geladen."));
  }

  /* ---------- Die Ansicht ---------- */
  function lernstandAnsicht(c){
    if (!c || typeof c.replaceChildren !== "function") return c;
    const kacheln = [naechsterKachel(), trainingKachel(), kompetenzkarte(), fehlerheft(), behaltenKachel(), pruefungKachel(), abzeichenKachel(), dexKachel()].filter(Boolean);
    c.replaceChildren(h("div", {class: "kr-seite lern-seite"},
      kopf(),
      h("div", {class: "bn-raster lern-raster"}, kacheln)));
    return c;
  }

  return {ansicht: lernstandAnsicht, training, kompetenzkarte, pruefungUebersicht, pruefungAbgeben};
})();
(UI.startHaken ||= []).push(() => {
  UI.app.registrieren("lernstand", {titel: "Lernstand", symbol: "lernstand",
    zeigen: UI.lernstand.ansicht, wieder: UI.lernstand.ansicht,
    zaehler: () => typeof L !== "undefined" ? L.faelligeIds(id => String(id).startsWith("lab.")).length : 0});
});
Object.assign(UI.karriere, {lernstandAnsicht: UI.lernstand.ansicht, pruefungUebersicht: UI.lernstand.pruefungUebersicht,
  pruefungAbgeben: UI.lernstand.pruefungAbgeben, training: UI.lernstand.training});
