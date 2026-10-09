"use strict";
/* ---------- Spiel: Klassenraum-Auftrag (Auftragscode der Lehrkraft; Architektur § 12, Entwurf § 4.5/E2) ----------
   Ein Klassenraum-Auftrag entsteht aus einem angesagten Code: jedes Gerät baut denselben Fall
   (`Spiel.instanzErstellen({ticketId|gen, seed, quelle:"klassenraum", ohneFlow:true})`, § 12 „Öffnungsweg"),
   geöffnet wird er über `Spiel.oeffnen(iid)`. Er ist eine ÜBUNG im Unterricht – kein Auftrag der Karriere:

   · KEIN Geld, KEIN Ruf: `Spiel.gutschreiben` wird nicht gerufen, `st.buch` bleibt leer.
   · KEIN `st.erledigt`: damit zählen Wochenziel (`woche.js`), Abzeichen (`abzeichen.js`), Auftragsformen
     (`formen.js`), Erste Stunde (`erstestunde.js`), Tagesbilanz (`tag.js`) und der Empfehlungs-Zähler
     (`kundenakte.js`) nicht mit – und die Kundensterne (`st.kunden[id].sterne`) bleiben leer.
   · KEIN Karriere-Ereignis: es wird kein „ticket-geloest" gemeldet; an diesem Bus-Ereignis hängt
     `Spiel.karriere.ticketGeloest` (Wartung, Arbeitstag, Aufstieg, Statistik).
   · Der Lernwert BLEIBT: `Spiel.lernenNachAbnahme(inst, def, abnahme)` läuft wie bei einem echten Auftrag
     (`L.ueben` je Fertigkeit, Fehlerheft bei Fehlschlägen) – dieselbe Auflage wie beim Training
     (`Spiel.training.abnehmen` ruft ihn selbst).

   Durchgesetzt wird das an EINER Stelle: `Spiel.abschliessen` schickt `quelle === "klassenraum"` als erste
   Zeile hierher um – symmetrisch zum Trainingszweig (`abnahme.js`, Zusage in Architektur § 13.3 Punkt 1).
   Weil die Umleitung VOR jedem Nebeneffekt steht (vor der Zeitbuchung, vor `st.erledigt.push`, vor
   `Spiel.gutschreiben`, vor der Kundenakte), entsteht gar kein Klassenraum-Eintrag im Spielstand; die
   Quellfilter der Karriere-Stellen bleiben dadurch toter Vorsorge-Code und müssen nicht nachgezogen werden.

   Öffentliche Fläche: `Spiel.klassenraum.abnehmen(inst|iid, abnahme?)` → Ergebnis in der Form von
   `Spiel.abschliessen`. Ohne bestandene Abnahme bleibt der Auftrag offen (wie beim Training). */
Spiel.klassenraum = (() => {
  /* Die Abnahme in der Form von Spiel.abnahme(inst); fehlt sie, wird sie hier geholt. */
  const abnahmeVon = (inst, ergebnis) => (ergebnis && typeof ergebnis === "object" && Array.isArray(ergebnis.ergebnisse))
    ? ergebnis : Spiel.abnahme(inst);

  /* Spiel.klassenraum.abnehmen(inst, abnahme) → Ergebnis für den Ergebnisbildschirm.
     Nimmt die Instanz (oder ihre Kennung). Schreibt NUR den Lernmotor – kein Euro, kein Ruf, kein
     `st.erledigt`, keine Wochenwertung, keine Abzeichen, kein Karriere-Ereignis, kein Postfach-Nachschub. */
  function abnehmen(instanz, ergebnis){
    const inst = typeof instanz === "string" ? Spiel.instanz(instanz) : instanz;
    if (!inst) return {ok: false, grund: "Dieser Klassenraum-Auftrag ist nicht mehr da."};
    if (inst.quelle !== "klassenraum") return {ok: false, grund: "Das ist kein Klassenraum-Auftrag."};
    const def = Spiel.defVon(inst);
    if (!def) return {ok: false, grund: "Zu diesem Auftrag fehlt die Aufgabe."};
    const ab = abnahmeVon(inst, ergebnis);
    const lernen = Spiel.lernenNachAbnahme(inst, def, ab);     /* der Lernwert – die eine Auflage */
    if (ab.bestanden) Spiel.instanzEntfernen(inst.iid);        /* gelöst: der Auftrag ist durch (wie beim Training) */
    const daten = {
      ok: true, klassenraum: inst.klassenraum || null,
      bestanden: !!ab.bestanden, sterne: ab.bestanden ? (ab.sterne || 0) : 0,
      abnahme: ab, lernen, def, inst,
      euro: 0, ruf: 0, lohn: {euro: 0, grund: 0, tempo: 0, ruf: 0},
      dank: "", erklaerung: def.erklaerung || "", quelle: def.quelle || "",
      naechstes: null, dex: [], raetsel: null, woche: null, verdacht: null, hotline: null, kundenakte: null, flow: null,
      hinweis: "Klassenraum-Auftrag: zahlt kein Geld und keinen Ruf und zählt nicht zur Karriere – er zählt für den Lernstand.",
    };
    Spiel.melden("klassenraum", {iid: inst.iid, bestanden: daten.bestanden, sterne: daten.sterne});
    Spiel.geaendert("klassenraum");
    Spiel.sofortSpeichern();
    return daten;
  }

  return {abnehmen};
})();
