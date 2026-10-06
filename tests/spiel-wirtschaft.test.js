"use strict";
/* SHOP ENTLASTEN (P5b): zwei Gruppen in der Ansicht, EINE Preisquelle für die Prüfung, eine Liste für
   Playbooks, Ausgrauung + Sammelhinweis statt Statuszeilen. Die Ansicht selbst (ui/karriere.js) wird im
   Browser gemessen (tools/rauch.py + Messung); hier steht der Vertrag der Daten, auf dem sie aufsetzt. */
gruppe("Spiel: Shop (P5b entlastet)", () => {
  const kapsel = (fn, {stufe = 3, euro = 1000} = {}) => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = stufe; Spiel._st.euro = euro;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD, {wahl: "AP1"});
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };

  pruefe("Ansicht: genau zwei Gruppen (Werkzeuge, Automatisierung); Verträge und Aussehen bleiben Artikel", kapsel(() => {
    erwarte.gleich(Spiel.shop.GRUPPEN, ["Werkzeuge", "Automatisierung"]);
    const liste = Spiel.shop.liste();
    const sichtbar = liste.filter(e => Spiel.shop.GRUPPEN.includes(e.gruppe));
    erwarte.gleich([...new Set(sichtbar.map(e => e.gruppe))], Spiel.shop.GRUPPEN, "nur diese zwei Gruppen zeigt die Ansicht");
    erwarte.gleich([...new Set(sichtbar.map(e => e.art))].sort(), ["playbook", "slot", "werkzeug"], "nur Werkzeuge, Slots, Playbooks");
    /* Die früheren Ladenhüter bleiben als Datenzeile – Kundenkarte, Aussehen-Zeile und Einstellungen benutzen sie */
    erwarte.wahr(liste.some(e => e.art === "vertrag" && e.gruppe === "Kunden"), "Vertragseintrag für die Kundenakte");
    erwarte.gleich(liste.filter(e => e.art === "aussehen").length, 9, "Aussehen: 9 Artikel für die eine Zeile");
    erwarte.gleich(liste.filter(e => e.art === "pruefung").length, 0, "keine Prüfungsanmeldung mehr im Shop");
  }));

  pruefe("Prüfungspreis: EINE Quelle (Spiel.PRUEFUNG.GEBUEHR), und die Prüfung bucht genau sie ab", kapsel(() => {
    erwarte.falsch("PRUEFUNG_GEBUEHR" in Spiel.WIRTSCHAFT, "der zweite Preis (60/90) ist gelöscht");
    erwarte.gleich(Spiel.PRUEFUNG.GEBUEHR, {AP1: 40, AP2: 80});
    Spiel.st.pruefungen = [{art: "AP1", tag: heute(), punkte: 60, note: 4}];      /* erste Prüfung vorbei: keine Gebühr erlassen */
    const vorher = Spiel.st.euro;
    const r = Spiel.pruefung.starten("AP1");
    erwarte.wahr(r.ok, JSON.stringify(r));
    erwarte.gleich(vorher - Spiel.st.euro, Spiel.PRUEFUNG.GEBUEHR.AP1, "abgebucht wird PRUEFUNG.GEBUEHR");
    erwarte.falsch(Spiel.shop.kaufen("pruefung:AP1").ok, "der zweite Bezahlweg ist weg");
  }));

  pruefe("Playbooks: eine Liste, ein Erklärsatz als Fußnote, „kein Slot“ bleibt von „gesperrt“ unterscheidbar", kapsel(() => {
    const spiele = Spiel.shop.liste().filter(e => e.art === "playbook");
    erwarte.wahr(spiele.length >= 1, "Playbooks stehen im Shop");
    erwarte.wahr(spiele.every(e => e.skill && /^Playbook: /.test(e.titel) && typeof e.preis === "number"), JSON.stringify(spiele[0]));
    const texte = new Set(spiele.filter(e => e.zustand !== "aktiv" && e.zustand !== "veraltet").map(e => e.text));
    erwarte.gleich(texte.size <= 1, true, "alle nicht laufenden Playbooks tragen denselben Satz (einmal als Fußnote)");
    const echt = Spiel.playbooks.liste;
    try {
      Spiel.playbooks.liste = () => [
        {skill: "lab.link", name: "Link und Kabel prüfen", box: 4, preis: 120, zustand: "kein-slot", text: "Alle Slots belegt."},
        {skill: "lab.ip", name: "IP-Adresse und Maske setzen", box: 1, preis: 120, zustand: "gesperrt", text: "ab sicher"},
      ];
      const l = Spiel.shop.liste().filter(e => e.art === "playbook");
      erwarte.gleich(l.map(e => [e.id, e.zustand]), [["playbook:lab.link", "kein-slot"], ["playbook:lab.ip", "gesperrt"]], "kein Slot ≠ gesperrt");
    } finally { Spiel.playbooks.liste = echt; }
  }));

  pruefe("Wartungsvertrag: der Kauf läuft über genau den Eintrag, den die Kundenkarte anzeigt", kapsel(() => {
    Spiel.st.ruf = 999;
    Spiel.st.kunden.salon = {vertrag: false, ampel: "gruen", seit: heute(), sterne: [4, 4, 4]};
    const e = Spiel.shop.liste().find(x => x.id === "vertrag:salon");
    erwarte.wahr(e && e.zustand === "kaufbar", JSON.stringify(e));
    erwarte.gleich(e.preis, Spiel.karriere.kunde("salon").vertragPreis, "Preis wie im Kundenkarten-Knopf");
    const r = Spiel.shop.kaufen("vertrag:salon");
    erwarte.wahr(r.ok, JSON.stringify(r));
    erwarte.wahr(Spiel.karriere.hatVertrag("salon"), "danach läuft der Vertrag");
  }));

  pruefe("Aussehen: Kauf bleibt im Shop möglich, Wechseln kostet kein zweites Mal", kapsel(() => {
    Spiel.st.euro = 300;
    const alle = Spiel.shop.liste().filter(e => e.art === "aussehen");
    erwarte.gleich(alle.length, 9);
    erwarte.gleich(alle.filter(e => e.zustand === "aktiv").length, 2, "je einer für Akzentfarbe und Leiste");
    erwarte.wahr(Spiel.shop.kaufen("aussehen:bernstein").ok);
    erwarte.gleich(Spiel.shop.liste().find(e => e.id === "aussehen:bernstein").zustand, "aktiv");
    erwarte.wahr(Spiel.shop.kaufen("aussehen:cyan").ok && Spiel.st.euro === 180, "zurück zum Standard kostet nichts");
  }));
});
