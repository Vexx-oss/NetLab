"use strict";
/* TON (spiel/ton.js): Leiste, Tray und Fenster im Hintergrund sind immer stumm; „aus“ ist aus; Standard ist leise. */
gruppe("Spiel: Ton", () => {
  pruefe("Leiste und Tray stumm – bei jeder Einstellung, mit und ohne Fokus", () => {
    for (const modus of ["leiste", "tray"]) for (const ton of ["aus", "leise", "normal", undefined]) for (const fokus of [true, false])
      erwarte.gleich(Spiel.tonPegel(ton, {modus, fokus}), 0, `${modus}/${ton}/${fokus}`);
  });
  pruefe("Vollansicht: aus = 0, leise < normal, ohne Fokus stumm, unbekannt = leise", () => {
    erwarte.gleich(Spiel.tonPegel("aus", {modus: "voll", fokus: true}), 0);
    const leise = Spiel.tonPegel("leise", {modus: "voll", fokus: true}), normal = Spiel.tonPegel("normal", {modus: "voll", fokus: true});
    erwarte.wahr(leise > 0 && normal > leise && normal <= 1, `leise ${leise}, normal ${normal}`);
    erwarte.gleich(Spiel.tonPegel("normal", {modus: "voll", fokus: false}), 0, "Fenster im Hintergrund");
    erwarte.gleich(Spiel.tonPegel(undefined, {modus: "voll", fokus: true}), leise, "Standard");
    erwarte.gleich(Spiel.EINST_STANDARD.ton, "leise", "Einstellungs-Standard");
  });
});
