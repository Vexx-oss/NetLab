"use strict";
/* EINSATZAKTE (Runde 4, Strang A): Datenhilfen des Dossiers – Schichtentreppe, Fundort, didaktische
   Leiter und Einsatzbericht. Headless, ohne UI: die Oberfläche (src/ui/akte.js) ruft nur diese Funktionen
   aus src/spiel/verdacht.js (Spiel.akte.*). Geprüft wird zusätzlich, dass die bestehende Verdacht-Bewertung
   unverändert bleibt und dass der Bericht vor dem Abschluss keine Lösung verrät (R1). */
gruppe("Spiel: Einsatzakte (Dossier)", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const instanz = (id, niveau = "E") => {
    Spiel._einst.wahl = niveau;
    const inst = Spiel.instanzErstellen({ticketId: id, quelle: "postfach"});
    Spiel.oeffnen(inst.iid);
    return inst;
  };
  const karte = (inst, art, felder) => Spiel.akte.hinzu(inst, Object.assign({art, titel: "Messung", befund: "Befund", ok: true}, felder));

  pruefe("Schichtentreppe: Schichten 1-2-3-4-7, Summe der Beweiszahlen = Kartenzahl, Karten bleiben unverändert", kapsel(() => {
    const leer = instanz("salon-01");
    const s0 = Spiel.akte.schichten(leer);
    erwarte.gleich(s0.schichten.map(s => s.n), [1, 2, 3, 4, 7]);
    erwarte.gleich([s0.gesamt, s0.ohne, s0.schichten.every(s => s.zahl === 0)], [0, 0, true], "leere Akte");

    const inst = instanz("baeckerei-01");
    karte(inst, "ping", {von: "kasse", nach: "drucker", ok: true, befund: "4/4 Antworten", titel: "Ping Kasse → Drucker"});
    karte(inst, "kabel", {von: "kasse:eth0", nach: "sw1:Fa0/1", ok: false, befund: "Kein Link", grund: "LINK_DOWN", schicht: 1, titel: "Kabeltest Kasse ↔ Switch"});
    karte(inst, "ping", {von: "kasse", nach: "inet", ok: false, befund: "Zeitüberschreitung – keine Antwort", grund: "ROUTE", schicht: 3, titel: "Ping Kasse → Internet"});
    karte(inst, "befehl", {von: "kasse", nach: "ipconfig", ok: true, befund: "Adresse, Maske und Gateway gelesen", titel: "Kasse: ipconfig"});
    karte(inst, "hotline", {von: "baeckerei", nach: null, ok: null, befund: "Kein Link", titel: "Kunde am Telefon"});
    const vorher = JSON.stringify(Spiel.akte.liste(inst));
    const s = Spiel.akte.schichten(inst);
    erwarte.gleich(s.schichten.map(x => x.n), [1, 2, 3, 4, 7]);
    erwarte.gleich(s.gesamt, 5, "fünf Karten");
    erwarte.gleich(s.schichten.reduce((n, x) => n + x.zahl, 0) + s.ohne, s.gesamt, "Summe der Schichten = Kartenzahl");
    erwarte.gleich(s.schichten.map(x => x.zahl), [1, 0, 1, 0, 0], "Beweise je Schicht");
    erwarte.gleich(s.ohne, 3, "Karten ohne Schicht: ok-Ping, Befehl, Kundenaussage");
    erwarte.gleich(s.schichten[2].name, "Vermittlung");
    erwarte.gleich(JSON.stringify(Spiel.akte.liste(inst)), vorher, "Zählen ändert keine Karte");
  }));

  pruefe("Fundort: Kabelkarte nennt beide Enden, Ping das Ziel, Befehl das Gerät, Kundenaussage nichts", kapsel(() => {
    const inst = instanz("baeckerei-01");
    const p = karte(inst, "ping", {von: "kasse", nach: "drucker", ok: true, befund: "4/4 Antworten"});
    erwarte.gleich(Spiel.akte.fundort(inst, p), {art: "geraet", geraet: "drucker"}, "Ping → Zielgerät");
    const kb = karte(inst, "kabel", {von: "kasse:eth0", nach: "sw1:Fa0/1", ok: false, befund: "Kein Link", schicht: 1});
    erwarte.gleich(Spiel.akte.fundort(inst, kb), {art: "kabel", kabel: {a: {geraet: "kasse", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/1"}}}, "Kabel → beide Enden");
    const be = karte(inst, "befehl", {von: "kasse", nach: "ipconfig", ok: true, befund: "Adresse gelesen"});
    erwarte.gleich(Spiel.akte.fundort(inst, be), {art: "geraet", geraet: "kasse"}, "Befehl → Gerät");
    const ho = karte(inst, "hotline", {von: "baeckerei", nach: null, ok: null, befund: "Kein Link"});
    erwarte.gleich(Spiel.akte.fundort(inst, ho), null, "Kundenaussage bleibt ohne Aktion");
    erwarte.gleich([Spiel.akte.fundort(inst, null), Spiel.akte.fundort(null, p)], [null, null], "ohne Karte/Instanz kein Ziel");
  }));

  pruefe("Didaktische Leiter: sechs Sprossen, Reihenfolge und nächster Schritt aus echten Daten", kapsel(() => {
    const inst = instanz("baeckerei-01");
    const f = () => Spiel.akte.fortschritt(inst);
    erwarte.gleich(f().map(s => s.id), ["beobachten", "messen", "eingrenzen", "hypothese", "handeln", "dokumentieren"]);
    erwarte.gleich(Spiel.akte.FORTSCHRITT.map(s => s.id), f().map(s => s.id), "Vorlage und Ergebnis stimmen überein");
    /* „Beobachten“: das geöffnete Ticket ist gelesen (Spiel.oeffnen setzt gelesen) */
    erwarte.gleich(f().map(s => s.erledigt), [true, false, false, false, false, false], "frisch geöffnet");
    erwarte.gleich(f().find(s => s.naechster).id, "messen");
    karte(inst, "ping", {von: "kasse", nach: "drucker", ok: true, befund: "4/4 Antworten"});
    erwarte.gleich(f().filter(s => s.erledigt).map(s => s.id), ["beobachten", "messen"]);
    erwarte.gleich(f().find(s => s.naechster).id, "eingrenzen");
    karte(inst, "ping", {von: "kasse", nach: "inet", ok: false, befund: "Zeitüberschreitung – keine Antwort", grund: "ROUTE", schicht: 3});
    erwarte.gleich(f().find(s => s.naechster).id, "hypothese");
    Spiel.verdacht.setzen(inst, {schicht: 3, ursache: "gateway-falsch", geraet: "kasse"});
    erwarte.gleich(f().find(s => s.naechster).id, "handeln");
    Spiel.aendern(inst, "Test", n => { n.geraete.kasse.an = false; });
    erwarte.gleich(f().find(s => s.naechster).id, "dokumentieren");
    Spiel.notizSetzen(inst, "Gateway an der Kasse korrigiert, Rückweg notiert.");
    erwarte.gleich(f().every(s => s.erledigt), true, "alle sechs erledigt");
    erwarte.gleich(f().filter(s => s.naechster), [], "kein nächster Schritt mehr");
    /* Der Bericht zählt als Dokumentation, auch ohne Notiz (Kopieren ist eine echte Handlung). */
    const ohneNotiz = instanz("salon-01");
    erwarte.falsch(Spiel.akte.fortschritt(ohneNotiz).find(s => s.id === "dokumentieren").erledigt, "ohne Notiz offen");
    erwarte.wahr(Spiel.akte.fortschritt(ohneNotiz, {kopiert: true}).find(s => s.id === "dokumentieren").erledigt, "Kopie zählt");
  }));

  pruefe("Einsatzbericht: echte Vorgangsdaten, vor dem Abschluss keine Lösung", kapsel(() => {
    const inst = instanz("baeckerei-01", "AP1");
    const raus = Spiel.akte.ausPing(inst, {von: "kasse", nach: "inet", ergebnis: Sim.ping(inst.netz, "kasse", "198.51.100.10", {anzahl: 4}), netz: inst.netz});
    karte(inst, "befehl", {von: "kasse", nach: "ipconfig", ok: true, befund: "Adresse, Maske und Gateway gelesen"});
    const richtig = Spiel.verdacht.richtig(inst);
    const richtigTitel = Spiel.INJEKTOREN[richtig.ursachen[0]].titel;
    const text = Spiel.akte.bericht(inst);
    erwarte.enthaelt(text, "Einsatzakte · " + Spiel.kundenDaten("baeckerei").name);
    erwarte.enthaelt(text, "Vorgang: baeckerei-01");
    erwarte.enthaelt(text, "Niveau: AP1");
    erwarte.enthaelt(text, "Beweise (2):");
    erwarte.enthaelt(text, "Deine Hypothese: noch keine festgehalten.");
    erwarte.enthaelt(text, "Geänderte Geräte: noch keine");
    /* R1: kein innerer Grund, keine Schicht, keine richtige Ursache, kein Stempel vor der Bewertung. */
    erwarte.falsch(text.includes("Schicht 3"), "keine Schicht im Bericht: " + text);
    erwarte.falsch(text.includes(richtigTitel), "keine Lösung im Bericht: " + text);
    erwarte.falsch(text.includes("Volltreffer"), "kein Stempel vor der Bewertung");
    if (raus && raus.grund) erwarte.falsch(text.includes(Spiel.grundTitel(raus.grund)), "kein Innengrund im Bericht");
    erwarte.gleich(Spiel.akte.bericht(inst), text, "derselbe Stand ergibt denselben Bericht");
    /* Auch im Einstieg bleibt der Bericht bei den sichtbaren Befunden – er wird weitergegeben. */
    const e = instanz("baeckerei-01", "E");
    const eRaus = Spiel.akte.ausPing(e, {von: "kasse", nach: "inet", ergebnis: Sim.ping(e.netz, "kasse", "198.51.100.10", {anzahl: 4}), netz: e.netz});
    const eText = Spiel.akte.bericht(e);
    erwarte.enthaelt(eText, "Niveau: Einstieg");
    if (eRaus && eRaus.grund) erwarte.falsch(eText.includes(Spiel.grundTitel(eRaus.grund)), "kein Innengrund auch im Einstieg");
    /* Eine falsche Hypothese ist ihre eigene Zeile – aber kein Ergebnis, solange nicht bewertet wurde. */
    const o = Spiel.verdacht.optionen(inst);
    const falsch = o.ursachen.find(u => !richtig.ursachen.includes(u.id));
    Spiel.verdacht.setzen(inst, {schicht: 1, ursache: falsch.id, geraet: "kasse"});
    const mitHypothese = Spiel.akte.bericht(inst);
    erwarte.enthaelt(mitHypothese, "Deine Hypothese: Schicht 1 · " + falsch.titel);
    erwarte.falsch(mitHypothese.includes("Ergebnis der Hypothese"), "solange nicht bewertet, kein Ergebnis");
    erwarte.falsch(mitHypothese.includes(richtigTitel), "die falsche Hypothese nennt nicht die Lösung");
    /* Erst die Bewertung (Spiel.verdacht.bewerten, unverändert) trägt den Stempel in den Bericht. */
    Spiel.verdacht.setzen(inst, {schicht: richtig.schichten[0], ursache: richtig.ursachen[0], geraet: richtig.geraete[0]});
    const bewertung = Spiel.verdacht.bewerten(inst);
    erwarte.gleich(bewertung.treffer, "voll", "Bewertung unverändert");
    erwarte.enthaelt(Spiel.akte.bericht(inst), "Ergebnis der Hypothese: Volltreffer");
  }));

  pruefe("Bewertung unverändert: die Anzeigehilfen ändern weder Verdacht noch Karten noch Ergebnis", kapsel(() => {
    const inst = instanz("baeckerei-01");
    karte(inst, "ping", {von: "kasse", nach: "inet", ok: false, befund: "Zeitüberschreitung – keine Antwort", grund: "ROUTE", schicht: 3});
    Spiel.verdacht.setzen(inst, {schicht: 3, ursache: "gateway-falsch", geraet: "kasse"});
    const vorher = JSON.stringify({verdacht: inst.verdacht, akte: Spiel.akte.liste(inst), notiz: inst.notiz || ""});
    Spiel.akte.schichten(inst); Spiel.akte.fundort(inst, Spiel.akte.liste(inst)[0]);
    Spiel.akte.fortschritt(inst); Spiel.akte.bericht(inst);
    const nachher = JSON.stringify({verdacht: inst.verdacht, akte: Spiel.akte.liste(inst), notiz: inst.notiz || ""});
    erwarte.gleich(nachher, vorher, "Hilfen sind reine Leser");
    /* Dieselben vier Trefferstufen wie bisher (tests/spiel-akte.test.js prüft sie ausführlich). */
    erwarte.gleich(Spiel.verdacht.bewerten(inst).treffer, "voll");
    Spiel.verdacht.setzen(inst, {schicht: 3, ursache: "gateway-falsch", geraet: "drucker"});
    erwarte.gleich(Spiel.verdacht.bewerten(inst).treffer, "ursache");
    Spiel.verdacht.setzen(inst, {schicht: 3, ursache: "maske-falsch", geraet: "kasse"});
    erwarte.gleich(Spiel.verdacht.bewerten(inst).treffer, "schicht");
    Spiel.verdacht.setzen(inst, {schicht: 1, ursache: "kabel-fehlt", geraet: "kasse"});
    erwarte.gleich(Spiel.verdacht.bewerten(inst).treffer, null);
    /* Und die Optionen bleiben vier Ursachen mit genau einer richtigen. */
    const o = Spiel.verdacht.optionen(inst), r = Spiel.verdacht.richtig(inst);
    erwarte.gleich([o.ursachen.length, o.ursachen.filter(u => r.ursachen.includes(u.id)).length], [4, 1]);
  }));
});
