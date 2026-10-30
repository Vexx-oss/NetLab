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
    const zu = () => { o.classList.remove("da"); setTimeout(() => o.remove(), UI.zeit("dauer")); document.removeEventListener("keydown", esc); };
    const esc = e => { if (e.key === "Escape") zu(); };
    document.addEventListener("keydown", esc);
    return zu;
  }

  /* Eine Zeile im „Was geht verloren / was bleibt“-Kasten. Steht auf Modulebene, weil beide
     Dialoge (Rechner übergeben und Von 0 anfangen) sie benutzen. */
  const zeile = (t, w) => h("p", {class: "sp-leise"}, h("strong", {}, t + ": "), w);

  /* Export wie in karriere.js:442: erst den Stand sichern, dann den Rechner räumen. Wer seinen
     Fortschritt behalten will, hat ihn damit in der Hand — der Punkt der ganzen Übergabe. */
  function exportieren(){
    store.sofort();
    const daten = {format: "netzwerk-labor", version: LABOR_VERSION, datum: heute(), speicher: store.alles()};
    return Plattform.datei.exportieren(`netzwerk-labor-${heute()}.json`, JSON.stringify(daten, null, 1));
  }

  /* Im Tauri-Programm ist `location.reload()` KEIN Neustart des Spielstands: Die Hülle liest
     `spielstand.json` beim Prozessstart ein und reicht den Stand als `__LABOR_SPEICHER__` an die
     Seite; ein Seiten-Reload bekommt denselben alten Stand wieder. Gemessen am 30.10.2026: nach
     „Ja, alles zurücksetzen" standen die alten 156 € wieder da — und der Altwert wurde beim
     nächsten Autosave sogar über die frische Datei geschrieben. Deshalb baut der Tauri-Weg die
     Oberfläche im laufenden Prozess neu auf (kein Neuladen): der frische Spielstand steht bereits
     im Speicher, alle Ansichten lesen ihn von dort. Im Browser bleibt `location.reload()` richtig
     (dort wird der Speicher neu aus localStorage gelesen). */
  function neuStarten(){
    try { UI.app?.dialogZu?.(); } catch (e) { /* Rahmen ohne Dialog */ }
    try { UI.menue?.zu?.(); } catch (e) { /* kein Menü offen */ }
    try { UI.palette?.schliessen?.(); } catch (e) { /* keine Palette offen */ }
    try {
      const S = UI.spiel && UI.spiel._S;
      if (S) { S.inst = null; S.live = null; S.demo = null; S.hilfeOffen = false; S.postfachWahl = null; S.fertig = null; }
    } catch (e) { /* Labor-Zustand ist optional */ }
    try { UI.labor?.auftragNeu?.(); } catch (e) { /* kein Labor aufgebaut */ }
    try { UI.spiel?.status?.(); } catch (e) { /* Kopfzeile */ }
    try { UI.app?.aktualisieren?.(); } catch (e) { /* Dock-Zähler */ }
    try { UI.app?.ansicht?.("heute"); } catch (e) { /* Ansicht neu */ }
    try { UI.toast?.("Neuer Spielstand — du beginnst von vorn.", "ok", {titel: "Neu anfangen"}); } catch (e) { /* ohne Toast */ }
  }

  function ausfuehren(lernstandBehalten, zu){
    const r = Spiel.uebergabe({lernstandBehalten});
    if (!r || !r.ok) { UI.toast((r && r.grund) || "Die Übergabe ist nicht gelungen.", "fehler"); return; }
    store.sofort();
    zu();
    if (typeof Plattform !== "undefined" && Plattform.name === "tauri") return neuStarten();
    /* Seite neu laden: danach baut sich jede Ansicht frisch auf und `aktiveLaden` findet keinen
       offenen Auftrag mehr. Derselbe Weg wie beim Import (karriere.js:461) — dort aus demselben
       Grund gewählt: nur so ist garantiert, dass kein Baustein den alten Stand weiterhält. */
    location.reload();
  }

  /* ---------- Eigener Spielstand: von 0 anfangen (30.10.2026) ----------
     Für den Einzelplatz: EIN Knopf, der den Spielstand dieses Rechners vollständig zurückwirft —
     inklusive Lernstand, denn „von 0 anfangen" heißt auch: die Kästen wieder leer. Die Einstellungen
     bleiben (Darstellung, Klang, Leiste, Bildungsstand). Der Weg ist derselbe wie bei der Übergabe
     mit „Löschen": `Spiel.uebergabe({lernstandBehalten:false})` + Neuladen. Vorher lässt sich der
     Stand als Datei sichern; danach steht der Einstieg wieder am Anfang. */
  function zeigenNeu(){
    const st = Spiel.st;
    const zu = overlay(h("div", {class: "sp-ergebnis uz-uebergabe"},
      h("h2", {}, "Von 0 anfangen?"),
      h("p", {}, `Dieser Rechner steht auf Stufe ${st.stufe} mit ${eur(st.euro)} €, ${st.ruf} Ruf und ${st.erledigt.length} erledigten Tickets. Beim Zurücksetzen beginnst du wieder mit 0 € und dem Einstieg.`),
      h("div", {class: "uz-was"},
        zeile("Geht verloren", "Geld, Ruf, Karrierestufe, Kunden, Aufträge, erledigte Tickets, Fehlerdex, Trainings- und Lernstand"),
        zeile("Bleibt", "Einstellungen (Darstellung, Klang, Leiste, Bildungsstand)")),
      h("p", {class: "uz-frage"}, "Das lässt sich nicht rückgängig machen. Vorher sichern?"),
      h("div", {class: "uz-knoepfe"},
        h("button", {type: "button", class: "knopf primaer", onclick: () => ausfuehren(false, zu)},
          "Ja, alles zurücksetzen", h("small", {}, "Spielstand und Lernstand löschen")),
        h("button", {type: "button", class: "knopf geist", onclick: () => zu()}, "Abbrechen")),
      h("div", {class: "sp-knoepfe"},
        h("button", {type: "button", class: "knopf geist", onclick: () => exportieren().then(ok => ok !== false && UI.toast("Spielstand gesichert — die Datei gehört dir.", "ok"))}, "Erst sichern (Datei)"),
        h("button", {type: "button", class: "knopf geist", onclick: () => { zu(); zeigen(); }}, "Rechner übergeben …"))));
    return zu;
  }

  function zeigen(){
    const st = Spiel.st, u = Spiel.uebergabeLetzte();
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
    /* Einzelplatz: eigener, klar benannter Weg zurück auf 0. Steht direkt nach der Übergabe,
       weil beide dasselbe Werkzeug benutzen, aber für verschiedene Menschen gedacht sind. */
    UI.app.einstellungAbschnitt("Neu anfangen", el => {
      el.append(
        h("div", {class: "einst-zeile"},
          h("div", {class: "einst-text"}, h("strong", {}, "Eigenen Spielstand zurücksetzen"),
            h("span", {}, "Löscht Konto, Ruf, Stufe, Kunden, Aufträge, Trainings- und Lernstand. Die Einstellungen bleiben. Danach beginnst du wieder beim Einstieg.")),
          h("div", {class: "einst-steuer"},
            h("button", {type: "button", class: "knopf", onclick: zeigenNeu}, "Von 0 anfangen …"))),
        h("p", {class: "sp-leise"}, "Für den Rechnerwechsel im Klassenraum ist „Rechner übergeben“ der passende Weg."));
    });
  });

  return {zeigen, zeigenNeu, ausfuehren};
})();
