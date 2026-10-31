"use strict";
/* CLI-REZEPT (CLI-05, W2/Tier 2, 31.10.2026): lab.speichern „Zurücksetzen“ wirkt wirklich.
   Befund: reload fragt bei ungesicherter Konfiguration „System configuration has been modified. Save? [yes/no]“.
   Wer hier Enter drückt, sichert die laufende Konfiguration und macht das Zurücksetzen zunichte. Der Rezepttext
   muss die Antwort „no“ dokumentieren; der Prüfstand muss ALLE Rückfragen je Zeile beantworten (delete fragt zweimal).
   Aufrufpfade: Recipe src/daten/wiki.js lab.speichern; Rückfragen src/cli/ios-befehle.js (erase/delete/reload). */
gruppe("CLI: Rezept-Wirkung lab.speichern", () => {
  const e = (s, ...z) => { let r; for (const x of z) r = CLI.eingabe(s, x); return r; };
  const zuruecksetzen = () => (DATEN.wiki["lab.speichern"].abschnitte || []).find(x => /Zurücksetzen/i.test(x.titel || ""));
  const rezeptBefehle = () => [...String(zuruecksetzen().html).matchAll(/<pre>([\s\S]*?)<\/pre>/g)]
    .flatMap(m => m[1].split("\n")).map(z => z.replace(/^\S+[>#]\s*/, "").trim()).filter(Boolean);

  pruefe("Rezepttext dokumentiert die Antwort „no“ auf die reload-Frage (sonst Reset wirkungslos)", () => {
    const html = String(zuruecksetzen().html);
    erwarte.passt(html, /Save\?/i, "der Rezepttext nennt die Save-Rückfrage von reload");
    erwarte.passt(html, /\[yes\/no\]/i, "der Rezepttext nennt das Antwortformat");
    erwarte.passt(html, /no/i, "der Rezepttext nennt die Antwort no");
    const befehle = rezeptBefehle();
    erwarte.gleich(befehle, ["erase startup-config", "delete flash:vlan.dat", "reload"], "die Reihenfolge des Rezepts");
  });

  pruefe("Rezept führt in den Werkszustand: delete beantwortet ZWEI Rückfragen, reload wird nicht geschluckt", () => {
    const n = Modell.neu(); Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    const s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "vlan 20", "name Verwaltung", "exit", "end", "write memory");
    const vorher = Object.keys(n.geraete.sw1.flash.vlans).length;
    const fragen = [];
    const ausfuehren = (bef) => {
      let r = CLI.eingabe(s, bef);
      let schutz = 0;
      while (s.rueckfrage && schutz++ < 3) {
        const frage = String(s.rueckfrage.prompt || "");
        fragen.push(frage);
        r = CLI.eingabe(s, /\[yes\/no\]/i.test(frage) ? "no" : "");
      }
      return r;
    };
    for (const bef of rezeptBefehle()) ausfuehren(bef);
    erwarte.wahr(fragen.some(f => /Delete filename/i.test(f)), "delete fragt nach dem Dateinamen");
    erwarte.wahr(fragen.some(f => /Delete flash:\/vlan\.dat\? \[confirm\]/i.test(f)), "delete fragt ein zweites Mal nach (wird nicht geschluckt)");
    erwarte.wahr(fragen.some(f => /Save\? \[yes\/no\]/i.test(f)), "reload fragt nach dem Speichern");
    erwarte.wahr(s.historie.includes("reload"), "die reload-Zeile wurde als Befehl ausgeführt");

    erwarte.gleich(n.geraete.sw1.startup, null, "nach dem Rezept gibt es keine startup-config mehr");
    erwarte.falsch(!!n.geraete.sw1.flash.vlans["20"], "VLAN 20 ist aus vlan.dat weg");
    erwarte.wahr(vorher > 1, "Testaufbau: vorher gab es mehr als ein VLAN");
    erwarte.gleich(n.geraete.sw1.running.hostname, "Switch", "running-config ist im Werkszustand");
  });
});
