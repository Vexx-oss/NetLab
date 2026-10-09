"use strict";
/* ---------- Terminal-Hilfe: Vorschlagsstreifen unter dem Schirm (Vertrag § 4.1, Präfix hl-) ----------
   UI.hilfe.zeichnen(container, {netz, geraetId, modus, sitzung, letzterFehler, text, verlauf, skill,
                                 befehlSetzen, ausfuehren})
     baut den Streifen und hängt ihn in container; gibt das Streifen-Element zurück (null = nichts zu zeigen,
     container wird dann geleert und versteckt).
   UI.hilfe.aktualisieren(K, {letzterFehler, text})
     nimmt den Terminal-Zustand von UI.konsole (K.netz, K.id, K.S, K.eingabeEl, K.hilfeEl) und zeichnet neu.

   WAS hier steht und was NICHT: Die Entscheidung (Stufe, Gerät, Modus, Anzahl, Text) trifft
   Spiel.hilfe.passend/geruest/leiter/syntaxBruecke – die Oberfläche zeichnet nur. Der Streifen
   klaut keinen Fokus: beim Zeichnen wird nichts fokussiert (kein autofocus, kein focus()); erst ein
   Klick setzt den Befehl in die Eingabe oder führt ihn aus. Alles ist per Maus bedienbar. */
UI.hilfe = (() => {
  const H = () => (typeof Spiel !== "undefined" && Spiel.hilfe) || null;

  /* „Azubi", „Azubi+", „Geselle", „Meister" – nur Anzeige; die Stufe selbst kommt aus Spiel.stufe. */
  function stufenName(){
    try {
      const s = typeof Spiel !== "undefined" && Spiel.stufe;
      if (s && typeof s.def === "function") { const d = s.def(); if (d && (d.kurz || d.name)) return String(d.kurz || d.name); }
    } catch (e) { /* Baustein A fehlt oder klemmt – dann der Rückfall */ }
    return "Azubi";
  }
  /* Vorrat aus Vertrag § 2.1 (nur Anzeige – verbraucht wird er in Spiel.stufe.hilfeZiehen).
     Ein leerer Vorrat sperrt nichts: er ändert nur den Text – und der lautet laut Vertrag
     „ab jetzt kostet es Sterne" (Stufe 4/5 = −½, Stufe 6 = −1). */
  function kontoStand(){
    try {
      const s = typeof Spiel !== "undefined" && Spiel.stufe;
      if (s && typeof s.konto === "function") {
        const k = s.konto();
        /* Ohne Vorrat (gesamt 0, z. B. kein offenes Ticket) gibt es nichts anzuzeigen – „Vorrat leer"
           wäre dort falsch. Nur ein echter, aufgebrauchter Vorrat nennt die Vertragszeile. */
        if (k && k.gesamt != null && Number(k.gesamt) > 0) {
          const frei = Math.max(0, Number(k.frei) || 0);
          return {leer: frei <= 0,
            text: frei <= 0 ? "Vorrat leer – ab jetzt kostet es Sterne (Stufe 4/5: −½, Stufe 6: −1)" : `noch ${frei} von ${k.gesamt} Hilfen`};
        }
      }
    } catch (e) { /* ohne offene Instanz gibt es kein Konto */ }
    return null;
  }
  /* Rang des Bildungsstands – nur zum Verstecken (meister sieht keine ungefragte Hilfe, § 2). */
  function rang(){
    try {
      const s = typeof Spiel !== "undefined" && Spiel.stufe;
      if (s && typeof s.rang === "function") { const r = Number(s.rang()); if (r >= 1 && r <= 4) return r; }
    } catch (e) { /* Baustein A fehlt – dann gilt azubi */ }
    return 1;
  }
  /* Ein Ergebnis der Konsole ohne fehler:true ist kein Fehler (es hat prompt/geaendert). */
  function fehlerOderNull(r){
    if (!r) return null;
    if (typeof r !== "object") return r;
    if (r.fehler === true) return r;
    if (r.fehler === false || "prompt" in r || "geaendert" in r) return null;
    return r;
  }
  const letzteZeile = S => (S && S.hist && S.hist.length ? String(S.hist[S.hist.length - 1]) : "");

  /* Klick: Befehl in die Eingabe setzen (Enter führt ihn aus) – der einzige Weg, der Fokus setzt. */
  function befehlSetzen(befehl, o){
    if (typeof o.befehlSetzen === "function") { o.befehlSetzen(befehl); return; }
    const el = o.eingabe;
    if (!el) return;
    el.value = befehl;
    try { el.focus({preventScroll: true}); } catch (e) { el.focus(); }
    try { el.setSelectionRange(befehl.length, befehl.length); } catch (e) { /* z. B. bei <input type=number> */ }
  }

  /* Welche Sprosse der Vorschlag ist – aus `ebene`, nicht aus `art` (task-8, 09.10.2026).
     Vertrag § 4: `ebene: 1..3` mit „1 = harmlos ansehen, 3 = ändert etwas". Bis heute stand hier nur
     „ansehen"/„ändern" aus `art` – eine Ebene 2 („genauer nachsehen, ohne etwas zu ändern") war damit
     für den Azubi unsichtbar, obwohl `Spiel.hilfe` sie längst kennt. Die Wörter für 1 und 3 bleiben
     wörtlich wie vorher; nur die mittlere Sprosse bekommt ihr eigenes Wort. */
  const EBENE_TEXT = {1: " · ansehen", 2: " · genauer nachsehen", 3: " · ändern"};
  function bereichText(v){
    const e = Number(v && v.ebene);
    if (EBENE_TEXT[e]) return String(v.bereich) + EBENE_TEXT[e];
    /* Kein `ebene` (Altbestand, synthetischer Vorschlag): wie vorher nach `art` entscheiden. */
    return String(v && v.bereich) + (v && v.art === "pruefen" ? " · ansehen" : " · ändern");
  }

  function vorschlagEl(v, o){
    const befehl = String(v.befehl == null ? "" : v.befehl);
    const teile = [h("span", {class: "hl-bereich"}, bereichText(v))];
    if (befehl) teile.push(h("button", {type: "button", class: "hl-knopf", title: "In die Eingabe übernehmen – Enter führt den Befehl aus",
      onclick: () => befehlSetzen(befehl, o)}, h("code", {}, befehl)));
    /* „Ausführen" nur beim ERSTEN Vorschlag: spart azubi-plus einen Knopf, und der zweite Vorschlag
       geht weiterhin über „in die Eingabe" (der Azubi tippt oder klickt, nichts passiert von selbst). */
    if (o.erster && v.art === "pruefen" && typeof o.ausfuehren === "function")
      teile.push(h("button", {type: "button", class: "hl-lauf", title: "Sofort ausführen – dieser Befehl ändert nichts", onclick: () => o.ausfuehren(befehl)}, "Ausführen"));
    if (v.syntax && v.syntax !== befehl) teile.push(h("span", {class: "hl-syntax"}, "Muster: " + v.syntax));
    if (v.erklaerung) teile.push(h("span", {class: "hl-erklaerung"}, v.erklaerung));
    if (v.warum) teile.push(h("span", {class: "hl-warum"}, v.warum));
    return h("div", {class: "hl-vorschlag"}, teile);
  }

  /* Eine Sprosse der Werkzeugleiter: mit Befehl ein Knopf (setzt ihn in die Eingabe), sonst nur Text. */
  function sprosseEl(s, o){
    const v = s.vorschlag;
    const inhalt = [v && v.befehl
      ? h("button", {type: "button", class: "hl-sprosse-knopf", title: "Prüfbefehl in die Eingabe übernehmen: " + v.befehl,
          onclick: () => befehlSetzen(String(v.befehl), o)}, s.titel)
      : h("span", {class: "hl-sprosse-titel"}, s.titel)];
    if (s.werkzeug) inhalt.push(h("span", {class: "hl-sprosse-text"}, s.werkzeug));
    return h("li", {class: "hl-sprosse" + (s.dran ? " hl-dran" : "")}, inhalt);
  }

  function brueckeEl(b){
    const teile = [h("span", {class: "hl-bruecke-titel"}, "So schreibt man das: " + b.titel),
      h("code", {class: "hl-bruecke-muster"}, b.muster)];
    if (b.beispiel) teile.push(h("span", {class: "hl-bruecke-beispiel"}, "Beispiel: " + b.beispiel));
    if (b.hinweis) teile.push(h("span", {class: "hl-bruecke-hinweis"}, b.hinweis));
    return h("div", {class: "hl-bruecke"}, teile);
  }

  function kopfEl(){
    const teile = [h("span", {class: "hl-titel"}, "Hilfe"), h("span", {class: "hl-stufe"}, stufenName())];
    const konto = kontoStand();
    if (konto) teile.push(h("span", {class: "hl-konto" + (konto.leer ? " hl-vorrat-leer" : "")}, konto.text));
    return h("div", {class: "hl-kopf"}, teile);
  }

  /* Aufklapp-Zeile (task-21): im Fehlerfall steht nur das Nötigste da, alles andere kommt auf Klick.
     Nur Maus, kein Fokusklau beim Zeichnen; `aria-expanded` sagt Screenreadern, was offen ist. */
  let KLAPPEN = 0;
  function klappeEl(beschriftung, kinder){
    const kennung = "hl-klappinhalt-" + (++KLAPPEN);
    const inhalt = h("div", {class: "hl-klappinhalt", id: kennung, hidden: true}, kinder);
    const knopf = h("button", {type: "button", class: "hl-klappe", "aria-expanded": "false", "aria-controls": kennung});
    const text = () => beschriftung + (inhalt.hidden ? " ▸" : " ▾");
    knopf.textContent = text();
    knopf.addEventListener("click", () => {
      inhalt.hidden = !inhalt.hidden;
      knopf.setAttribute("aria-expanded", String(!inhalt.hidden));
      knopf.textContent = text();
    });
    return h("div", {class: "hl-mehr"}, knopf, inhalt);
  }

  /* Die geübte Fertigkeit: die ausdrücklich übergebene, sonst die Hauptfertigkeit des OFFENEN Auftrags
     (Spiel.stufeInstanz + Spiel.defVon – beides öffentliche Fläche). Nötig, weil UI.konsole den Streifen
     ohne `skill` zeichnet (konsole.js:80) und Spiel.hilfe.leiter bewusst keinen globalen Zustand liest:
     ohne diesen Schritt wäre `dran` in der echten Oberfläche NIE wahr und zehn Fertigkeiten hätten keine
     hervorgehobene Sprosse (task-28, Befund A3). Beschafft wird hier nur die Fertigkeit – WELCHER
     Vorschlag je Sprosse gilt, entscheidet weiterhin Spiel.hilfe (Vertrag § 4.1). */
  function skillJetzt(o){
    if (o && o.skill) return String(o.skill);
    try {
      const inst = typeof Spiel.stufeInstanz === "function" ? Spiel.stufeInstanz() : null;
      const def = inst && typeof Spiel.defVon === "function" ? Spiel.defVon(inst) : null;
      const erst = def && def.skills && def.skills[0];
      return erst ? String(erst) : null;
    } catch (e) { return null; }                       /* ohne offenen Auftrag keine Fertigkeit */
  }

  /* ---------- der Streifen ---------- */
  function zeichnen(container, o = {}){
    if (!container) return null;
    const sp = H();
    const netz = o.netz || null, id = o.geraetId != null ? o.geraetId : o.id;
    const sitzung = o.sitzung || null;
    const modus = o.modus != null ? o.modus : (sitzung ? sitzung.modus : null);
    const letzterFehler = fehlerOderNull(o.letzterFehler);
    const text = o.text != null ? o.text : (letzterFehler && letzterFehler.befehl) || "";
    const frage = {netz, id, modus, art: o.art, verlauf: o.verlauf || (sitzung && sitzung.historie) || null, letzterFehler, max: o.max};
    const skill = skillJetzt(o);
    let geruest = null, leiter = [], vorschlaege = [], bruecke = null, fehlertext = null;
    if (sp && netz && id != null) {
      try { if (typeof sp.geruest === "function") geruest = sp.geruest(frage); } catch (e) { console.error("Spiel.hilfe.geruest", e); }
      try { if (typeof sp.leiter === "function") leiter = sp.leiter(Object.assign({}, frage, {skill})) || []; } catch (e) { console.error("Spiel.hilfe.leiter", e); }
      try { if (typeof sp.passend === "function") vorschlaege = sp.passend(frage) || []; } catch (e) { console.error("Spiel.hilfe.passend", e); }
      try {
        if (typeof sp.syntaxBruecke === "function" && (letzterFehler || text))
          bruecke = sp.syntaxBruecke({netz, id, modus, text, fehler: letzterFehler});
      } catch (e) { console.error("Spiel.hilfe.syntaxBruecke", e); }
    }
    /* Baustein E erklärt die konkrete Meldung (Spiel.fehlertext) – nicht selbst formatieren.
       Der Meister bekommt nichts (§ 2, Zeile „Tipp zu falschem Befehl": nein). */
    if (letzterFehler && rang() < 4 && typeof Spiel !== "undefined" && typeof Spiel.fehlertext === "function") {
      try { fehlertext = Spiel.fehlertext({netz, id, modus, eingabe: text, fehler: letzterFehler}); } catch (e) { console.error("Spiel.fehlertext", e); }
    }
    /* Eine Quelle fürs Muster: erst die eigene Syntax-Brücke (§ 4.1), sonst das Muster aus E. */
    if (!bruecke && fehlertext && fehlertext.muster)
      bruecke = {titel: fehlertext.titel, muster: fehlertext.muster, beispiel: fehlertext.beispiel || null, hinweis: null};
    const streifen = h("div", {class: "hl-streifen"});
    streifen.append(kopfEl());
    const fehlerEl = fehlertext ? h("div", {class: "hl-fehler"},
      h("span", {class: "hl-fehler-titel"}, fehlertext.titel),
      h("span", {class: "hl-fehler-text"}, fehlertext.text)) : null;
    const geruestEl = geruest ? h("p", {class: "hl-geruest"}, h("span", {class: "hl-frage"}, "Was geht hier? "), geruest) : null;
    const leiterEl = leiter.length ? h("ol", {class: "hl-leiter"}, leiter.map(s => sprosseEl(s, o))) : null;
    const brueckeTeil = bruecke ? brueckeEl(bruecke) : null;
    if (letzterFehler) {
      /* FEHLERFALL (task-21): eine Sache je Zustand – Fehlertext und der ERSTE Vorschlag. Gerüst,
         Werkzeugleiter, Syntax-Brücke und weitere Vorschläge liegen hinter der Aufklapp-Zeile.
         Es wird nichts verraten, was vorher nicht dastand: nur weniger gleichzeitig. */
      if (fehlerEl) streifen.append(fehlerEl);
      const erster = vorschlaege[0], weitere = vorschlaege.slice(1);
      if (erster) streifen.append(h("div", {class: "hl-vorschlaege"}, vorschlagEl(erster, Object.assign({}, o, {erster: true}))));
      const klappenTeile = [];
      if (weitere.length) klappenTeile.push(h("div", {class: "hl-vorschlaege"}, weitere.map(v => vorschlagEl(v, Object.assign({}, o, {erster: false})))));
      if (geruestEl) klappenTeile.push(geruestEl);
      if (leiterEl) klappenTeile.push(leiterEl);
      if (brueckeTeil) klappenTeile.push(brueckeTeil);
      if (klappenTeile.length) {
        /* Kurze Beschriftung: „Was geht hier?" und „So schreibt man das" stehen als Überschrift IN
           den aufgeklappten Teilen – die Zeile selbst soll so wenig Text wie möglich kosten. */
        const namen = [];
        if (leiter.length) namen.push(`Werkzeugleiter (${leiter.length})`);
        else if (weitere.length) namen.push(`Weitere Vorschläge (${weitere.length})`);
        else namen.push("Mehr zeigen");
        streifen.append(klappeEl(namen.join(" · "), klappenTeile));
      }
    } else {
      /* OHNE Fehler bleibt es wie bisher: Gerüst, Werkzeugleiter und die Vorschläge stehen offen. */
      if (geruestEl) streifen.append(geruestEl);
      if (leiterEl) streifen.append(leiterEl);
      if (vorschlaege.length) streifen.append(h("div", {class: "hl-vorschlaege"},
        vorschlaege.map((v, i) => vorschlagEl(v, Object.assign({}, o, {erster: i === 0})))));
      if (brueckeTeil) streifen.append(brueckeTeil);
    }
    const leer = !geruest && !leiter.length && !vorschlaege.length && !bruecke && !fehlertext;
    container.replaceChildren();
    if (!leer) container.append(streifen);
    container.hidden = leer;
    container.classList.toggle("hl-mit", !leer);
    return leer ? null : streifen;
  }

  /* ---------- Anschluss an UI.konsole ---------- */
  function aktualisieren(K, o = {}){
    if (!K || !K.hilfeEl) return null;
    const S = K.S;
    if (!K.netz || !S || !S.sitzung || (K.eingabeEl && K.eingabeEl.disabled)) {
      K.hilfeEl.replaceChildren(); K.hilfeEl.hidden = true; K.hilfeEl.classList.remove("hl-mit");
      return null;
    }
    const roh = o.letzterFehler !== undefined ? o.letzterFehler : S.letzterFehler;
    const letzterFehler = fehlerOderNull(roh);
    return zeichnen(K.hilfeEl, {
      netz: K.netz, geraetId: K.id, modus: S.sitzung.modus, sitzung: S.sitzung,
      letzterFehler, text: o.text != null ? o.text : (letzterFehler && letzterFehler.befehl) || letzteZeile(S),
      verlauf: S.hist, skill: o.skill, max: o.max, eingabe: K.eingabeEl,
      befehlSetzen: befehl => {
        if (typeof o.befehlSetzen === "function") { o.befehlSetzen(befehl); return; }
        if (!K.eingabeEl) return;
        K.eingabeEl.value = S.entwurf = befehl;
        if (typeof o.groesse === "function") o.groesse();
        try { K.eingabeEl.focus({preventScroll: true}); } catch (e) { K.eingabeEl.focus(); }
        try { K.eingabeEl.setSelectionRange(befehl.length, befehl.length); } catch (e) { /* nur Anzeige */ }
      },
      ausfuehren: typeof o.ausfuehren === "function" ? o.ausfuehren : null,
    });
  }

  return {zeichnen, aktualisieren};
})();
