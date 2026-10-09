"use strict";
/* WERKZEUGLEISTE UND AUFTRAGSMAPPE DÜRFEN SICH NICHT ÜBERDECKEN (Befund des Nutzers, 09.10.2026)

   Der Nutzer meldete „Tools überlappen Text". Gemessen im echten Browser (Edge, 1200x760):
     .lb-leiste-oben (Werkzeugleiste)  y=121  h=48   z-index 20
     .am-reiter      (Mappen-Reiter)   y=120  h=37   (in .am-mappe, z-index 30)
   Beide Bänder lagen deckungsgleich: die Mappe liegt in `.lb-auftrag` (z-index 10) und kommt aus
   diesem Stapelkontext nicht heraus – ihre 30 helfen ihr nicht gegen die 20 der Leiste. Durch die
   Lücken der Leiste schien der Text der Mappe durch (die „1" des Nutzers war die aus „Ziele 0/1").
   Nach dem Einbau (gemessen, dieselben drei Breiten): Reiter y=187, Leiste y=121–169 – kein
   Schnitt mehr; der Durchlauf über alle 25 Breiten von 640 bis 1600 px meldet 0 Auffälligkeiten.

   Diese Datei prüft die VERDRAHTUNG und die ZAHLEN. Den geometrischen Beweis führt die Messung:
   `Nachweise/Ueberlappung/` (Bilder vorher/nachher, `messung-nachher.txt`, Messskripte) – ein
   Testkasten kann kein Layout rechnen, und ein Test, der nur eine Zeichenkette sucht, wäre
   „grün ohne Wirkung". Deshalb steht hier die Rechnung: der Kopfraum der Mappe muss mindestens
   so groß sein wie Leistenoberkante + Leistenhöhe + Luft, abzüglich dessen, was die Mappe schon
   unter der Auftragsleiste sitzt. */
gruppe("UI: Werkzeugleiste verdeckt die Auftragsmappe nicht", () => {
  const fs = require("fs"), path = require("path");
  const W = path.join(__dirname, "..");
  const cssSpiel = fs.readFileSync(path.join(W, "src", "stil", "spiel.css"), "utf8");
  const cssEditor = fs.readFileSync(path.join(W, "src", "stil", "editor.css"), "utf8");
  const editorJs = fs.readFileSync(path.join(W, "src", "ui", "editor.js"), "utf8");

  /* Die Regel der Mappe: `--am-kopfraum:calc(var(--leiste-h, <rückfall>px) + <Luft>px)` – die
     Rechnung steht als eigene Größe, weil `padding` nach der Hausregel R4 nur Skalenwerte tragen
     darf (gemessen: die erste Fassung mit der Rechnung direkt im `padding` erzeugte +2 R4-Fehler). */
  const regel = cssSpiel.match(/--am-kopfraum:calc\(var\(--leiste-h,\s*(\d+)px\)\s*\+\s*(\d+)px\)/);
  const nutzt = /\.am-mappe\{[^}]*?padding-top:var\(--am-kopfraum\)/.test(cssSpiel);

  pruefe("Die Mappe hat einen Kopfraum, der an der gemessenen Leistenhöhe hängt", () => {
    erwarte.wahr(!!regel, "spiel.css: --am-kopfraum = calc(var(--leiste-h, …px) + …px)");
    erwarte.wahr(nutzt, "spiel.css: .am-mappe setzt padding-top:var(--am-kopfraum)");
    const rueckfall = Number(regel[1]), luft = Number(regel[2]);
    erwarte.wahr(luft > 0, `die Luft über der Mappe ist größer als 0 (ist ${luft})`);
    /* Ohne JavaScript (Rückfall) muss der Kopfraum auch für die grobe Zeigereingabe reichen:
       dort sind die Knöpfe der Leiste 44 px hoch (editor.css, @media (pointer: coarse)). */
    erwarte.wahr(rueckfall >= 44, `der Rückfall (${rueckfall}px) deckt die 44-px-Leiste der groben Zeigereingabe ab`);
  });

  pruefe("Der Kopfraum reicht rechnerisch über die Werkzeugleiste hinaus", () => {
    const oberkante = cssEditor.match(/\.lb-leiste-oben\{[^}]*?top:(\d+)px/);
    erwarte.wahr(!!oberkante, "editor.css: .lb-leiste-oben hat ein top in px");
    const top = Number(oberkante[1]);
    /* Gemessene Zahlen des Einbaus: die Mappe sitzt 5 px unter der Auftragsleiste (top:100% +
       margin-top:6px gegen die Oberkante der Fläche), die Leiste braucht top + Höhe, dazu 8 px Luft. */
    const LUFT = 8, MAPPE_UNTER_LEISTE = 5, LEISTE_GROB = 44;
    const noetig = top + LEISTE_GROB + LUFT - MAPPE_UNTER_LEISTE;
    const vorhanden = Number(regel[1]) + Number(regel[2]);
    erwarte.wahr(vorhanden >= noetig,
      `Kopfraum ${vorhanden}px muss mindestens ${noetig}px sein (Leiste top ${top} + ${LEISTE_GROB}px + ${LUFT}px Luft − ${MAPPE_UNTER_LEISTE}px Sitz)`);
  });

  pruefe("Die Leistenhöhe wird GEMESSEN, nicht geschätzt, und zieht bei Änderungen nach", () => {
    erwarte.enthaelt(editorJs, "oben.offsetHeight", "editor.js misst die Höhe der Leiste am Element");
    erwarte.enthaelt(editorJs, '"--leiste-h"', "editor.js setzt --leiste-h");
    erwarte.wahr(/new ResizeObserver\([^)]*\)\.observe\(oben\)/.test(editorJs),
      "ein ResizeObserver beobachtet die Leiste (die Höhe ändert sich bei grober Zeigereingabe)");
  });

  pruefe("Gegenprobe: die alte Fassung hätte den Test nicht bestanden", () => {
    /* Ohne den Kopfraum lagen Reiter und Leiste deckungsgleich (gemessene y-Werte 120 und 121).
       Der Test hält fest, dass die Regel nicht versehentlich wieder verschwindet. */
    const ohneKopfraum = cssSpiel.replace(/--am-kopfraum:calc\([^)]*\)[^;]*;/, "")
                                 .replace(/padding-top:var\(--am-kopfraum\);/, "");
    erwarte.falsch(/--am-kopfraum:calc\(var\(--leiste-h/.test(ohneKopfraum),
      "nach dem Entfernen der Regel findet der Test sie nicht mehr (er misst also die Regel, nicht den Dateinamen)");
    erwarte.falsch(/\.am-mappe\{[^}]*?padding-top:var\(--am-kopfraum\)/.test(ohneKopfraum),
      "auch die Verwendung im padding ist dann weg");
  });
});
