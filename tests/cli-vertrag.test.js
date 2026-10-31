"use strict";
/* CLI-VERTRAG (CLI-08, W2/Tier 2, 31.10.2026): Vertragsverweise und Aufräumen der CLI-Schicht.
   Statische Prüfung wie tests/inhalt-korrektheit.test.js: liest die Quellen, keine Laufzeitabhängigkeit.
   Bericht backend-cli.md CLI-17: toter Verweis CLI.erklaere, Verweise auf fehlende Architektur-Abschnitte,
   doppelte tipps-Zuordnung. Stand 31.10.2026: §10 ist in docs/Architektur.md wiederhergestellt. */
gruppe("CLI: Vertrag und Aufräumen", () => {
  const fs = require("fs"), path = require("path");
  const WURZEL = path.resolve(__dirname, ".."), CLI_DIR = path.join(WURZEL, "src", "cli");
  const dateien = fs.readdirSync(CLI_DIR).filter(n => n.endsWith(".js")).sort();
  const inhalt = n => fs.readFileSync(path.join(CLI_DIR, n), "utf8");
  const architektur = () => fs.readFileSync(path.join(WURZEL, "docs", "Architektur.md"), "utf8");

  pruefe("kein toter Verweis auf CLI.erklaere (existiert nicht)", () => {
    const treffer = dateien.filter(n => /CLI\.erklaere/.test(inhalt(n)));
    erwarte.gleich(treffer, [], "CLI.erklaere wird zitiert, existiert aber nicht");
  });

  pruefe("jeder §-Verweis in src/cli hat eine Überschrift in docs/Architektur.md", () => {
    const arch = architektur(), fehlend = [];
    for (const n of dateien) for (const m of inhalt(n).matchAll(/§\s*(\d+)/g)) {
      const nr = m[1];
      if (!new RegExp("^## " + nr + " ·", "m").test(arch)) fehlend.push(n + ": §" + nr);
    }
    erwarte.gleich([...new Set(fehlend)], [], "jeder §-Verweis hat eine Überschrift");
  });

  pruefe("tipps wird in parser.js genau einmal zugeordnet", () => {
    const code = inhalt("parser.js").split("\n").filter(z => !/^\s*(\/\/|\*|\/\*)/.test(z)).join("\n");
    erwarte.gleich((code.match(/tipps\s*:/g) || []).length, 1, "keine doppelte tipps-Zuordnung (Kommentare zählen nicht)");
  });

  pruefe("keine Platzhalter oder TODOs in src/cli", () => {
    const treffer = dateien.filter(n => /TODO|FIXME|Platzhalter|wird nachgetragen/i.test(inhalt(n)));
    erwarte.gleich(treffer, []);
  });
});
