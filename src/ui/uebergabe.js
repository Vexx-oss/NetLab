"use strict";
/* ---------- UI: Übergabe an den nächsten Azubi (Fahrplan 1.3/2.0, Schritt 0) ----------
   Ein Rechner, viele Azubis. Der Knopf steht in den Einstellungen im Abschnitt „Spielstand“
   (dort, wo auch Export und Import stehen — das ist der Ort für „mein Stand und der Rechner“).

   WARUM DIESE DATEI ÜBERHAUPT: Der Rechnerwechsel war bisher nicht lösbar. `src/ui/spiel.js`
   öffnet beim Start den offenen Auftrag des Vorgängers (`aktiveLaden`), und im Spiel gab es
   keinen Weg, den Rechner zu übergeben. Damit war das Spiel ab der zweiten Unterrichtsstunde
   unbrauchbar (Fahrplan § 1, belegt an `src/ui/spiel.js:857`).

   Die Logik liegt in `src/spiel/uebergabe.js` (kein DOM, testbar); hier nur Anzeige und Klick. */
UI.uebergabe = (() => {
  /* Derselbe Overlay-Bau wie `src/ui/karriere.js:279-290` und `src/ui/spiel.js:437` — mit
     Escape-Hörer, weil genau der dort einmal fehlte (Befund vom 06.10.2026: „Prüfung AP1“ und
     „Mini-Ticket“ blieben nach Escape offen, während spiel.js und hub.js korrekt schlossen). */
  function overlay(inhalt){
    const o = h("div", {class: "sp-overlay", role: "dialog", "aria-modal": "true"}, h("div", {class: "sp-karte"}, inhalt));
    document.body.append(o);
    requestAnimationFrame(() => o.classList.add("da"));
    const zu = () => { o.classList.remove("da"); setTimeout(() => o.remove(), 180); document.removeEventListener("keydown", esc); };
    const esc = e => { if (e.key === "Escape") zu(); };
    document.addEventListener("keydown", esc);
    return zu;
  }

  /* Export wie in karriere.js:442: erst den Stand sichern, dann den Rechner räumen. Wer seinen
     Fortschritt behalten will, hat ihn damit in der Hand — der Punkt der ganzen Übergabe. */
  function exportieren(){
    store.sofort();
    const daten = {format: "netzwerk-labor", version: LABOR_VERSION, datum: heute(), speicher: store.alles()};
    return Plattform.datei.exportieren(`netzwerk-labor-${heute()}.json`, JSON.stringify(daten, null, 1));
  }

  function ausfuehren(lernstandBehalten, zu){
    const r = Spiel.uebergabe({lernstandBehalten});
    if (!r || !r.ok) { UI.toast((r && r.grund) || "Die Übergabe ist nicht gelungen.", "fehler"); return; }
    store.sofort();
    zu();
    /* Seite neu laden: danach baut sich jede Ansicht frisch auf und `aktiveLaden` findet keinen
       offenen Auftrag mehr. Derselbe Weg wie beim Import (karriere.js:461) — dort aus demselben
       Grund gewählt: nur so ist garantiert, dass kein Baustein den alten Stand weiterhält. */
    location.reload();
  }

  function zeigen(){
    const st = Spiel.st, u = Spiel.uebergabeLetzte();
    const zeile = (t, w) => h("p", {class: "sp-leise"}, h("strong", {}, t + ": "), w);
    const zu = overlay(h("div", {class: "sp-ergebnis uz-uebergabe"},
      h("h2", {}, "Rechner übergeben?"),
      h("p", {}, `Dieser Rechner steht auf Stufe ${st.stufe} mit ${eur(st.euro)} €, ${st.ruf} Ruf und ${st.erledigt.length} erledigten Tickets.`),
      h("p", {}, "Der nächste Azubi bekommt einen leeren Rechner und kann sofort anfangen."),
      h("div", {class: "uz-was"},
        zeile("Geht verloren", "Geld, Ruf, Aufträge, erledigte Tickets, Fehlerdex"),
        zeile("Bleibt", "Einstellungen (Bildungsstand, Klang, Leiste)")),
      h("p", {class: "uz-frage"}, "Und der Lernstand — die Kästen, die der Lernmotor führt?"),
      h("div", {class: "uz-knoepfe"},
        h("button", {type: "button", class: "knopf primaer", onclick: () => ausfuehren(true, zu)},
          "Behalten", h("small", {}, "für diesen Rechner weiterlernen")),
        h("button", {type: "button", class: "knopf", onclick: () => ausfuehren(false, zu)},
          "Löschen", h("small", {}, "der nächste Azubi fängt frisch an"))),
      h("p", {class: "sp-leise"}, "Der Lernstand hängt am Rechner, nicht an der Person. Im Computerraum ist „Löschen“ meistens richtig — zu Hause „Behalten“."),
      h("div", {class: "sp-knoepfe"},
        h("button", {type: "button", class: "knopf geist", onclick: () => exportieren().then(ok => ok !== false && UI.toast("Spielstand gesichert — die Datei gehört dem Azubi.", "ok"))}, "Erst sichern (Datei)"),
        h("button", {type: "button", class: "knopf geist", onclick: () => zu()}, "Abbrechen")),
      u ? h("p", {class: "sp-leise"}, `Zuletzt übergeben: ${datumDe(heute(new Date(u.t)))} · Lernstand ${u.lernstandBehalten ? "behalten" : "gelöscht"}`) : null));
    return zu;
  }

  /* Der Knopf im Abschnitt „Spielstand“. Eigener Abschnitt statt Anbau an karriere.js:
     app.js gehört dem Rahmen, und `einstellungAbschnitt` ist genau dafür da (§ app.js:6).
     Reihenfolge ist egal — der Abschnitt wird angehängt, nicht ersetzt. */
  (UI.startHaken ||= []).push(() => {
    if (!UI.app || typeof UI.app.einstellungAbschnitt !== "function") return;
    UI.app.einstellungAbschnitt("Rechner übergeben", el => {
      el.append(
        h("div", {class: "sp-knoepfe"},
          h("button", {type: "button", class: "knopf", onclick: zeigen}, "Rechner übergeben …")),
        h("p", {class: "sp-leise"}, "Für den Computerraum: der nächste Azubi bekommt einen leeren Rechner. Vorher kannst du den Stand als Datei sichern."));
    });
  });

  return {zeigen, ausfuehren};
})();
