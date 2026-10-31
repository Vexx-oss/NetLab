"use strict";
/* LRN-03 (3.0.0): IHK-Note EXAKT, ohne Rundung. Vertrag: Architektur § 17.2 (Notenschlüssel).
   Befund: Math.round in abgeben() und note() hob Grenzfälle eine Stufe (91,67 % -> 92 -> Note 1).
   Soll: note(91.99)=2, note(92)=1, note(80.5)=3, note(66.9)=4; bestanden aus exaktem Prozentwert
   (49,99 % nicht bestanden); 0 Fälle < 92 % mit Note 1 (3 Aufgaben x 1-6 Ziele). */
gruppe("Prüfung: IHK-Note exakt (LRN-03)", () => {
  const P = () => Spiel.pruefung;
  pruefe("Grenzfälle: exakte Vergleiche statt Rundung", () => {
    erwarte.gleich([P().note(92), P().note(91.99), P().note(91), P().note(81), P().note(80.99), P().note(80.5), P().note(80), P().note(67), P().note(66.9), P().note(66)],
      [1, 2, 2, 2, 3, 3, 3, 3, 4, 4], "note() rundet nicht: 91.99 -> 2, 80.99 -> 3, 80.5 -> 3, 66.9 -> 4");
    erwarte.gleich([P().note(50), P().note(49.99), P().note(49), P().note(30), P().note(29.99), P().note(29)],
      [4, 5, 5, 5, 6, 6], "untere Grenzen exakt: 49.99 -> 5, 29.99 -> 6");
    erwarte.gleich([P().note(100), P().note(0), P().note(-1), P().note(NaN)], [1, 6, 6, 6], "Ränder und Unbrauchbares");
  });

  pruefe("bestanden aus exaktem Prozentwert: 49,99 % nicht bestanden, 50 % bestanden", () => {
    erwarte.gleich([P().bestanden(50), P().bestanden(50.01), P().bestanden(49.99), P().bestanden(0)], [true, true, false, false], "bestanden() exakt");
    erwarte.gleich(P().bestanden(P().note(49.99) >= 0 ? 49.99 : 0), false, "49,99 % bleibt nicht bestanden");
  });

  pruefe("Kombinationstest 3 Aufgaben x 1-6 Ziele: KEIN Fall unter 92 % bekommt Note 1", () => {
    const faelle = [];
    for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) for (let c = 0; c <= 6; c++){
      const punkte = 100 * (a + b + c) / 18;            /* drei Aufgaben zu je 6 Zielen (max. Kombination) */
      if (punkte < 92 && P().note(punkte) === 1) faelle.push([a, b, c, Math.round(punkte * 100) / 100]);
    }
    erwarte.gleich(faelle, [], "0 Fälle unter 92 % mit Note 1");
    /* Auch die kleinste gebrochene Grenze aus dem Befund: 91,67 % -> Note 2. */
    erwarte.gleich(P().note(100 * 11 / 12), 2, "91,67 % -> Note 2 (vorher 1)");
    console.log("MESSUNG LRN-03: Grenzfälle exakt · bestanden(49.99)=false · 0 Kombinationen <92 % mit Note 1");
  });
});
