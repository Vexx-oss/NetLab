"use strict";
/* AKTE, VERDACHT, WERKZEUGE (Phase B; Architektur § 9.4): Beweiskarten aus echten Pings, Verdacht mit genau einer
   richtigen Ursache unter vier, Treffer-Stufen samt Erklärsatz, Bonus vor dem Eingriff, Werkzeuge im Shop. */
gruppe("Spiel: Akte und Verdacht", () => {
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
  const pingKarte = (inst, von, nach) => {
    const netz = inst.netz, ip = UIfreieAdresse(netz, nach);
    return Spiel.akte.ausPing(inst, {von, nach, ergebnis: Sim.ping(netz, von, ip, {anzahl: 4}), netz});
  };
  const UIfreieAdresse = (netz, id) => netz.geraete[id].running.if.eth0.ip;

  pruefe("Akte: Ping legt eine Karte mit Befund wie die Windows-Ausgabe ab; gleiche Messung = „2×“; ★ markiert", kapsel(() => {
    const inst = instanz("baeckerei-01");                 /* falsches Gateway an der Kasse */
    const k = pingKarte(inst, "kasse", "buero");          /* gleiches Netz: klappt */
    erwarte.wahr(k && k.ok && /4\/4 Antworten/.test(k.befund) && k.grund === null, "Ping im LAN: " + JSON.stringify(k));
    const ziel = Object.values(inst.netz.geraete).find(g => g.typ === "internet");
    const raus = Spiel.akte.ausPing(inst, {von: "kasse", nach: ziel.id, ergebnis: Sim.ping(inst.netz, "kasse", "198.51.100.10", {anzahl: 4}), netz: inst.netz});
    erwarte.wahr(raus && !raus.ok && /Zeitüberschreitung|nicht erreichbar/.test(raus.befund), "Ping nach draußen scheitert: " + (raus && raus.befund));
    erwarte.wahr(raus.grund && raus.schicht === 3, "Grund und Schicht stehen in der Karte (gezeigt nur im Einstieg): " + raus.grund);
    const nochmal = Spiel.akte.ausPing(inst, {von: "kasse", nach: ziel.id, ergebnis: Sim.ping(inst.netz, "kasse", "198.51.100.10", {anzahl: 4}), netz: inst.netz});
    erwarte.gleich([Spiel.akte.liste(inst).length, nochmal.anzahl], [2, 2], "dieselbe Messung zählt hoch");
    Spiel.akte.stern(inst, raus.n);
    erwarte.wahr(Spiel.akte.liste(inst).find(x => x.n === raus.n).wichtig, "★");
    const kt = Spiel.akte.ausKabeltest(inst, {a: {geraet: "kasse", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/1"}, oben: true});
    erwarte.wahr(kt.art === "kabel" && kt.ok && kt.schicht === 1, "Kabeltest-Karte");
  }));

  pruefe("Verdacht: vier Ursachen, genau eine richtig, passend zum Netztyp; Geräte = das Netz ohne Internet", kapsel(() => {
    for (const id of ["salon-01", "salon-02", "baeckerei-01", "buero-01", "praxis-04"]) {
      const inst = instanz(id);
      const o = Spiel.verdacht.optionen(inst), r = Spiel.verdacht.richtig(inst);
      erwarte.gleich(o.ursachen.length, 4, id + ": vier Ursachen");
      erwarte.gleich(o.ursachen.filter(u => r.ursachen.includes(u.id)).length, 1, id + ": genau eine richtig");
      erwarte.gleich(new Set(o.ursachen.map(u => u.titel)).size, 4, id + ": verschiedene Titel");
      const vorlage = Spiel.defVon(inst).vorlage;
      erwarte.wahr(o.ursachen.every(u => Spiel.INJEKTOREN[u.id].vorlagen.includes(vorlage)), id + ": alle möglich in " + vorlage);
      erwarte.wahr(o.geraete.length >= 3 && !o.geraete.some(g => inst.netz.geraete[g.id].typ === "internet"), id + ": Geräte");
      erwarte.wahr(r.geraete.length >= 1, id + ": richtige Geräte bekannt");
      erwarte.gleich(JSON.stringify(Spiel.verdacht.optionen(inst)), JSON.stringify(o), id + ": deterministisch");
    }
  }));

  pruefe("Verdacht bewerten: voll / ursache / schicht / daneben – mit Erklärsatz; vor dem Eingriff +10 % Lohn", kapsel(() => {
    const inst = instanz("baeckerei-01");
    Spiel.verdacht.setzen(inst, {schicht: 3, ursache: "gateway-falsch", geraet: "kasse"});
    erwarte.wahr(inst.verdacht.vorEingriff, "vor dem Eingriff");
    let b = Spiel.verdacht.bewerten(inst);
    erwarte.gleich(b.treffer, "voll"); erwarte.wahr(/Volltreffer/.test(b.text), b.text);
    Spiel.verdacht.setzen(inst, {schicht: 3, ursache: "gateway-falsch", geraet: "drucker"});
    erwarte.gleich(Spiel.verdacht.bewerten(inst).treffer, "ursache");
    Spiel.verdacht.setzen(inst, {schicht: 3, ursache: "maske-falsch", geraet: "kasse"});
    b = Spiel.verdacht.bewerten(inst);
    erwarte.gleich(b.treffer, "schicht"); erwarte.wahr(/Falsches Standardgateway/.test(b.text), b.text);
    Spiel.verdacht.setzen(inst, {schicht: 1, ursache: "kabel-fehlt", geraet: "kasse"});
    b = Spiel.verdacht.bewerten(inst);
    erwarte.gleich(b.treffer, null); erwarte.wahr(/Du hattest Schicht 1 vermutet/.test(b.text) && /Woran man es erkennt/.test(b.text), b.text);
    /* Bonus nur bei Volltreffer vor dem Eingriff */
    const mit = instanz("baeckerei-01");
    Spiel.verdacht.setzen(mit, {schicht: 3, ursache: "gateway-falsch", geraet: "kasse"});
    Spiel.aendern(mit, "Lösung", n => Spiel.loesung(n, Spiel.defVon(mit).loesung));
    const e1 = Spiel.abschliessen(mit, Spiel.abnahme(mit));
    erwarte.wahr(e1.bestanden && e1.lohn.verdacht > 0 && e1.verdacht.treffer === "voll", "Bonus: " + JSON.stringify(e1.lohn));
    const spaet = instanz("baeckerei-01");
    Spiel.aendern(spaet, "Lösung", n => Spiel.loesung(n, Spiel.defVon(spaet).loesung));
    Spiel.verdacht.setzen(spaet, {schicht: 3, ursache: "gateway-falsch", geraet: "kasse"});
    erwarte.falsch(spaet.verdacht.vorEingriff, "nach dem Eingriff gesetzt");
    const e2 = Spiel.abschliessen(spaet, Spiel.abnahme(spaet));
    erwarte.wahr(e2.bestanden && !e2.lohn.verdacht && e2.verdacht.treffer === "voll", "kein Bonus nach dem Eingriff");
  }));

  pruefe("Hilfestufe 2 nennt echte Werkzeugtipps (Shop-Werkzeuge überschreiben sie nicht)", kapsel(() => {
    for (const id of ["salon-01", "baeckerei-01", "buero-01", "praxis-04"]) {
      const inst = instanz(id);
      const r = Spiel.hilfeInhalt(inst, 2);
      erwarte.wahr(r.werkzeuge.length && r.werkzeuge.every(w => typeof w === "string" && w.length > 10), id + ": " + JSON.stringify(r.werkzeuge));
    }
  }));

  pruefe("Werkzeuge: im Shop kaufbar (Kabeltester ab Stufe 1, Netzprüfer ab 2), Netzprüfer schaltet „!“ im AP-Niveau zu", kapsel(() => {
    Spiel.st.stufe = 1; Spiel.st.euro = 1000;
    const shop = Spiel.shop.liste().filter(e => e.art === "werkzeug");
    erwarte.gleich(shop.map(e => [e.id, e.zustand]), [["werkzeug:kabeltester", "kaufbar"], ["werkzeug:netzpruefer", "gesperrt"]]);
    erwarte.wahr(Spiel.shop.kaufen("werkzeug:kabeltester").ok && Spiel.werkzeug.hat("kabeltester"), "Kabeltester gekauft");
    erwarte.falsch(Spiel.shop.kaufen("werkzeug:netzpruefer").ok, "Netzprüfer erst ab Stufe 2");
    Spiel.st.stufe = 2;
    erwarte.wahr(Spiel.shop.kaufen("werkzeug:netzpruefer").ok, "Netzprüfer gekauft");
    const inst = instanz("baeckerei-01", "AP2");
    erwarte.falsch(Spiel.regeln(inst).warnungen, "AP2: aus");
    Spiel.werkzeug.netzpruefer(inst, true);
    erwarte.wahr(Spiel.regeln(inst).warnungen, "mit Netzprüfer: an");
    erwarte.gleich(Spiel.abnahme(Object.assign(inst, {})).abzuege.filter(a => /Hilfe/.test(a.text)), [], "kein Sternabzug für den Netzprüfer");
  }));

  pruefe("Aussehen: Kauf schaltet um und meldet es; Gekauftes lässt sich ohne erneutes Bezahlen wieder auswählen (auch der Standard)", kapsel(() => {
    Spiel.st.euro = 300;
    const zustand = id => Spiel.shop.liste().find(e => e.id === "aussehen:" + id).zustand;
    erwarte.gleich([zustand("cyan"), zustand("bernstein")], ["aktiv", "kaufbar"]);
    erwarte.wahr(Spiel.shop.kaufen("aussehen:bernstein").ok);
    erwarte.gleich([zustand("cyan"), zustand("bernstein"), Spiel.st.euro], ["gekauft", "aktiv", 180], "gekauft, aktiv, bezahlt");
    erwarte.wahr(Spiel.shop.kaufen("aussehen:cyan").ok && Spiel.karriere.daten().aussehen.akzent === "cyan", "zurück zum Standard");
    erwarte.wahr(Spiel.shop.kaufen("aussehen:bernstein").ok && Spiel.st.euro === 180, "wieder auswählen kostet nichts");
  }));
});
