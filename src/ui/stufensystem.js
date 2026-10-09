"use strict";
/* ---------- UI: Einstellungs-Abschnitt „Bildungsstand" ----------
   Verbindlich: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 1, § 2, § 3.

   Die Oberfläche zeigt die vier Stufen (Spiel.STUFE), je eine Zeile Erklärung und darunter,
   was die gewählte Stufe gerade freischaltet – damit die Wahl nicht geraten werden muss.
   Geschrieben wird ausschließlich über Spiel.stufe.setzen, damit einst.stufe und einst.niveau
   zusammen bleiben (Vertrag § 3).

   Der Abschnitt hängt sich beim Laden selbst ein (UI.app.einstellungAbschnitt). app.js gehört
   dem App-Rahmen und wird dafür nicht angefasst; der bestehende Abschnitt „Erklärtiefe" bleibt
   unberührt, denn die Erklärtiefe ist eine eigene Achse und einzeln verstellbar.

   Diese Datei ist nur der DOM-Teil: die beiden Texte kommen aus Spiel.stufe.erklaerungText und
   Spiel.stufe.freigabeText (headless prüfbar, eine Sprache für Terminal, Leiste und Training).
   Sie benutzt nur document.createElement/append – kein h(), damit sie in jeder Testseite läuft. */

UI.stufeAbschnitt = (() => {
  /* Ein Knopf je Stufe. */
  function knopf(d, gewaehlt, auswahl, zeile, hinweis){
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.className = "st-knopf" + (d.id === gewaehlt ? " an" : "");
    b.setAttribute("aria-checked", String(d.id === gewaehlt));
    b.textContent = d.name;
    b.addEventListener("click", () => {
      for (const x of auswahl.querySelectorAll(".st-knopf")) {
        x.classList.toggle("an", x === b);
        x.setAttribute("aria-checked", String(x === b));
      }
      Spiel.stufe.setzen(d.id);
      zeile.textContent = Spiel.stufe.erklaerungText(d.id);
      hinweis.textContent = Spiel.stufe.freigabeText(d.id);
      /* Die Ansichten hängen an der Stufe (Vorschlagsstreifen, Leiste, Training):
         neu zeichnen, wenn dieser Klick fertig ist. */
      setTimeout(() => {
        const a = UI.app.aktuell;
        if (!a) return;
        UI.app.ansicht(a === "labor" ? "postfach" : "labor");
        UI.app.ansicht(a);
      }, 0);
    });
    return b;
  }

  /* Die Auswahl der vier Stufen in den Container des Einstellungs-Abschnitts bauen. */
  function zeichnen(container){
    const gewaehlt = Spiel.stufe.id();
    const kasten = document.createElement("div");
    kasten.className = "st";
    kasten.setAttribute("data-stufe", gewaehlt);
    const auswahl = document.createElement("div");
    auswahl.className = "wahl";
    auswahl.setAttribute("role", "radiogroup");
    auswahl.setAttribute("aria-label", "Bildungsstand");
    const zeile = document.createElement("p");
    zeile.className = "st-erklaerung";
    zeile.textContent = Spiel.stufe.erklaerungText(gewaehlt);
    const hinweis = document.createElement("p");
    hinweis.className = "st-freigabe";
    hinweis.setAttribute("aria-live", "polite");
    hinweis.textContent = Spiel.stufe.freigabeText(gewaehlt);
    for (const d of Spiel.stufe.alle()) auswahl.append(knopf(d, gewaehlt, auswahl, zeile, hinweis));
    kasten.append(auswahl, zeile, hinweis);
    container.append(kasten);
    return kasten;
  }

  return {zeichnen};
})();

/* Abschnitt registrieren – beim Laden dieser Datei, aber ERST nach dem App-Rahmen.
   WARUM NICHT DIREKT: Die ui-Schicht wird alphabetisch gebaut, `app.js` steht in bauen.py in der
   Schlussliste und kommt deshalb NACH `stufensystem.js`. Ein sofortiger `UI.app.einstellungAbschnitt(…)`
   lief in den echten Browserlauf in einen TypeError (`Cannot read properties of undefined (reading
   'einstellungAbschnitt')`) — und weil `UI.starten` danach abbricht, war die ganze Seite tot:
   `python tools/rauch.py` meldete 0/36 (gemessen 07.10.2026). In den headless-Tests fiel das nicht auf,
   weil dort ein `UI.app`-Ersatz vorher gesetzt wird — genau die Falle, gegen die „Wirkung vor Grün" da ist.
   `UI.startHaken` ist der vorgesehene Weg (app.js:11, wie ui/karriere.js:510 und ui/training.js:132). */
(UI.startHaken ||= []).push(() => { UI.app.einstellungAbschnitt("Bildungsstand", container => { UI.stufeAbschnitt.zeichnen(container); }); });
