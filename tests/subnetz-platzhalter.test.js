"use strict";
/* Z-07 (P1, W1-Hotfix): Der Platzhalter im Antwortfeld darf die Lösung NICHT vorwegnehmen.
   Befund: eingabeText() setzte Beispielwerte („z. B. 64", „/26 oder 255.255.255.192"), die bei
   Masken-/Zahl-/IP-Aufgaben exakt die gesuchte Lösung nennen — UIL-01 („kein Lösungswert vor
   Prüfen") war damit umgangen. Verbindlich jetzt: der Platzhalter nennt nur das FORMAT und
   enthält keine Ziffern; zusätzlich steht kein Lösungswert in Frage/Lage (dotted Werte geprüft). */
gruppe("Subnetz: Platzhalter ohne Lösung (Z-07)", () => {
  const S = () => Spiel.subnetz;
  /* Leck: Lösung (wert oder text) steht im Platzhalter. */
  function leckPlatzhalter(a){
    const p = String((a.eingabe || {}).platzhalter || "");
    const werte = [(a.loesung || {}).wert, (a.loesung || {}).text].filter(w => w != null && String(w).length > 0).map(String);
    return werte.some(w => p.includes(w));
  }
  pruefe("Alle Aufgabentypen: Platzhalter ohne Ziffern, kein Lösungswert in Platzhalter/Frage/Lage", () => {
    const gesehen = new Set(), ohnePlatzhalter = [], lecks = [];
    let zahl = 0;
    for (const art of S().ARTEN){
      for (const stufe of art.stufen){
        for (const seed of [1, 2, 3, 7]){
          const a = S().aufgabe({art: art.id, niveau: stufe, seed});
          const e = a && a.eingabe;
          if (!e || e.art === "auswahl") continue;
          zahl++;
          gesehen.add(e.art);
          const p = String(e.platzhalter || "");
          if (!p.trim()) ohnePlatzhalter.push(art.id + "/" + stufe);
          if (/\d/.test(p)) lecks.push(`${art.id}/${stufe}: Platzhalter mit Ziffern „${p}"`);
          if (leckPlatzhalter(a)) lecks.push(`${art.id}/${stufe}: Lösung im Platzhalter`);
        }
      }
    }
    erwarte.wahr(zahl >= 20, "geprüfte Aufgaben: " + zahl);
    erwarte.gleich([...gesehen].sort(), ["ip", "maske", "zahl"], "alle drei Eingabearten kommen vor");
    erwarte.gleich(ohnePlatzhalter, [], "jedes Eingabefeld hat einen Platzhalter (sonst greift der UI-Fallback)");
    erwarte.gleich(lecks, [], "kein Lösungswert vor dem Aufdecken: " + JSON.stringify(lecks.slice(0, 6)));
    console.log(`MESSUNG Z-07: ${zahl} Aufgaben aus ${new Set(S().ARTEN.map(a => a.id)).size} Typen · Eingabearten ${[...gesehen].sort().join("/")} · Platzhalter-Lecks 0`);
  });
  pruefe("Gegenprobe: die Prüfregel erkennt einen eingeschmuggten Sollwert (falsifizierbar)", () => {
    const echt = S().aufgabe({art: "maske", niveau: "E", seed: 1});
    const kopie = JSON.parse(JSON.stringify(echt));
    erwarte.falsch(leckPlatzhalter(kopie), "die echte Aufgabe ist ohne Leck");
    kopie.eingabe = Object.assign({}, kopie.eingabe, {platzhalter: "z. B. " + kopie.loesung.wert});
    erwarte.wahr(leckPlatzhalter(kopie), "eingeschmuggelter Sollwert im Platzhalter wird erkannt");
  });
});
