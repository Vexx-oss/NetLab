"use strict";
/* RUNDE 5 (31.10.2026): Die Auftragsmappe ist ein eigenes Blatt über der Karte — kein zweiter Kopf.

   VORGESCHICHTE: Seit 09.10.2026 lag die Mappe in #labor-auftrag (z-index 10) und kam aus diesem
   Stapelkontext nicht heraus; die Werkzeugleiste (.lb-leiste-oben, z-index 20) malte über ihre
   Reiter. Der erste Fix war ein Kopfraum (--am-kopfraum/padding-top), der den Mappeninhalt unter
   die Leiste schob — optisch blieb ein überlappender Streifen („Lagebild"/Tools im Mappenkopf).
   Der Nutzer hat das am 31.10.2026 erneut als „unordentlich überlappend" gemeldet.

   NEUE REGEL (Runde 5, Vertrag § 2 A): Solange die Mappe offen ist, ruht die Fläche. UI.spiel setzt
   die Klasse "mappe-an" am .labor; editor.css blendet Werkzeugleiste und Flächentitel aus und hebt
   den Auftragsbereich auf die Sprosse 30. Der Kopfraum-Hack ist ersatzlos entfallen. Die Mappe bleibt
   Kind von #labor-auftrag (Testhaken unverändert).

   Diese Datei prüft die VERDRAHTUNG und die ZAHLEN; den geometrischen Beweis führt die Messung:
   Nachweise/runde5/auftragsbogen/MESSUNG.md und Nachweise/runde5/audit/ (vorher). */
gruppe("UI: Werkzeugleiste ruht bei offener Auftragsmappe", () => {
  const fs = require("fs"), path = require("path");
  const W = path.join(__dirname, "..");
  const cssSpiel = fs.readFileSync(path.join(W, "src", "stil", "spiel.css"), "utf8");
  const cssEditor = fs.readFileSync(path.join(W, "src", "stil", "editor.css"), "utf8");
  const jsSpiel = fs.readFileSync(path.join(W, "src", "ui", "spiel.js"), "utf8");
  const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, "");
  const cssE = ohneKommentar(cssEditor).replace(/\s+/g, " ");
  const cssS = ohneKommentar(cssSpiel).replace(/\s+/g, " ");

  pruefe("Die Mappe meldet sich am Labor als mappe-an und räumt beim Schließen ab", () => {
    erwarte.enthaelt(jsSpiel, 'classList.toggle("mappe-an"', "spiel.js setzt die Klasse am .labor");
    erwarte.enthaelt(jsSpiel, "function mappeUmgebung", "die Klasse wird an EINER Stelle geführt");
    erwarte.enthaelt(jsSpiel, "S.mappe.offen", "sie hängt am offenen Zustand der Mappe");
    erwarte.enthaelt(jsSpiel, 'UI.app.aktuell === "labor"', "und nur an der Labor-Ansicht");
    const treffer = jsSpiel.match(/mappeUmgebung\(\)/g) || [];
    erwarte.wahr(treffer.length >= 2, "mappeUmgebung wird bei Öffnen UND Schließen/Ticketende gerufen");
  });

  pruefe("editor.css blendet Werkzeugleiste und Flächentitel unter .labor.mappe-an aus", () => {
    erwarte.passt(cssE, /\.labor\.mappe-an \.lb-leiste-oben[^{]*\{[^}]*visibility:hidden/, "Regel .lb-leiste-oben");
    erwarte.passt(cssE, /\.labor\.mappe-an \.lb-leiste-unten[^{]*\{[^}]*visibility:hidden/, "Regel .lb-leiste-unten");
    erwarte.passt(cssE, /\.labor\.mappe-an \.lb-leinwand::before[^{]*\{[^}]*visibility:hidden/, "Regel Flächentitel");
    erwarte.falsch(/\.labor\.mappe-an \.lb-leiste-oben[^{]*\{[^}]*display:none/.test(cssE), "ausblenden per visibility, nicht per display (kein Springen)");
  });

  pruefe("Der Auftragsbereich steigt über Karte, Minimap UND den Dock (z-index > 45)", () => {
    const dock = fs.readFileSync(path.join(W, "src", "stil", "zz-polaris.css"), "utf8").replace(/\s+/g, " ");
    const dockZ = dock.match(/\.labor\.dock-da \.lb-dock\{[^}]*z-index:(\d+)/);
    erwarte.wahr(!!dockZ, "zz-polaris.css: Dock hat eine z-index-Sprosse");
    const z = Number(dockZ[1]);
    const auftrag = cssE.match(/\.labor\.mappe-an \.lb-auftrag\{[^}]*z-index:(\d+)/);
    erwarte.wahr(!!auftrag, "editor.css: .labor.mappe-an .lb-auftrag hat eine z-index-Sprosse");
    erwarte.wahr(Number(auftrag[1]) > z,
      "der Auftragsbereich (" + auftrag[1] + ") liegt über dem Dock (" + z + ") — sonst sind X und Fußknopf bei 960/720 verdeckt (Prüfer-1-Befund)");
    erwarte.passt(cssS, /\.am-mappe\{[^}]*position:absolute/, "die Mappe bleibt absolut verankert");
    erwarte.passt(cssS, /\.am-mappe\{[^}]*z-index:30/, "die Mappe selbst steht auf Sprosse 30");
  });

  pruefe("Der alte Kopfraum-Hack ist ersatzlos weg", () => {
    erwarte.falsch(/--am-kopfraum/.test(cssS), "spiel.css nennt --am-kopfraum nicht mehr");
    erwarte.falsch(/padding-top:var\(--am-kopfraum\)/.test(cssS), "padding-top:var(--am-kopfraum) ist weg");
    const alt = cssS + " .am-mappe{--am-kopfraum:calc(var(--leiste-h, 48px) + 13px);padding-top:var(--am-kopfraum)}";
    erwarte.wahr(/--am-kopfraum/.test(alt), "die Gegenprobe findet den alten Hack in der alten Fassung");
  });

  pruefe("Die Höhe folgt dem Inhalt statt eines festen Kastens", () => {
    erwarte.passt(cssS, /\.am-mappe\{[^}]*max-height:var\(--am-max, ?min\(70vh, ?560px\)\)/, "Höchsthöhe hängt am freien Platz");
    erwarte.passt(cssS, /\.am-ziele-liste \.sp-ziele\{[^}]*flex:0 1 auto/, "die Zielliste trägt nicht mehr flex:2 1 320px");
    erwarte.enthaelt(jsSpiel, "--am-max", "spiel.js setzt --am-max aus dem gemessenen freien Platz");
  });

  pruefe("Esc schließt, Fokus geht zurück zum Auslöser (wiring)", () => {
    erwarte.enthaelt(jsSpiel, "ausloeser", "der Auslöser wird gemerkt");
    erwarte.enthaelt(jsSpiel, "Escape", "der Escape-Hörer bleibt");
    erwarte.enthaelt(jsSpiel, ".am-lesen", 'ohne Auslöser fällt der Fokus auf den Knopf Auftrag lesen zurück');
  });
});
