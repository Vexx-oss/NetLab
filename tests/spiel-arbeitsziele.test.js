"use strict";
/* ARBEITSZIELE (Plan – Ausbau 1.2, C4; Architektur § 9.5): Zielarten „befehl“ und „antwort“ prüfen die Arbeit im Auftrag,
   nicht das Netz. Befehle zählen nur am richtigen Gerät und fehlerfrei; Antworten werden gegen das aktuelle Netz geprüft und
   verraten den richtigen Wert nicht. Terminal-Aufträge bestehen den Durchspiel-Test – und ohne die Arbeit nicht. */
gruppe("Spiel: Arbeitsziele", () => {
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
  const status = inst => Spiel.zieleStatus(inst).map(s => s.ok ? "ok" : s.grund);

  pruefe("befehl: zählt nur am richtigen Gerät, fehlerfrei, ohne Groß/klein und Mehrfach-Leerzeichen", kapsel(() => {
    const inst = instanz("baeckerei-terminal", "AP1");
    const def = Spiel.defVon(inst);
    erwarte.gleich(def.ziele.map(z => z.typ), ["erreichbar", "befehl", "befehl", "befehl"]);
    erwarte.gleich(status(inst), ["GW_UNREACHABLE", "BEFEHL_FEHLT", "BEFEHL_FEHLT", "BEFEHL_FEHLT"]);
    Spiel.befehle.merken(inst, {geraet: "kasse", befehl: "ipconfig", ok: true});          /* falsches Gerät */
    Spiel.befehle.merken(inst, {geraet: "buero", befehl: "ipconfg", ok: false});          /* Tippfehler */
    erwarte.gleich(status(inst)[1], "BEFEHL_FEHLT");
    Spiel.befehle.merken(inst, {geraet: "buero", befehl: "IPCONFIG   /ALL", ok: true});
    erwarte.gleich(status(inst)[1], "ok");
    Spiel.befehle.merken(inst, {geraet: "buero", befehl: "ping 192.168.10.172", ok: true});   /* das falsche Gateway zählt nicht als Router */
    erwarte.gleich(status(inst)[2], "BEFEHL_FEHLT");
    Spiel.befehle.merken(inst, {geraet: "buero", befehl: "ping -n 2 192.168.10.254", ok: true});
    erwarte.gleich(status(inst)[2], "ok");
    /* Reparatur über das echte Terminal (Verlauf = rückgängig machbar) */
    const s = CLI.sitzung(inst.netz, "buero", {verlauf: Spiel.verlaufVon(inst)});
    const zeile = "netsh interface ip set address \"Ethernet\" static 192.168.10.17 255.255.255.0 192.168.10.254";
    const r = CLI.eingabe(s, zeile);
    Spiel.befehle.merken(inst, {geraet: "buero", befehl: zeile, ok: !r.fehler});
    erwarte.gleich(status(inst), ["ok", "ok", "ok", "ok"]);
    Spiel.verlaufVon(inst).zurueck();
    erwarte.gleich(status(inst)[0], "GW_UNREACHABLE", "Rückgängig nimmt die netsh-Änderung zurück");
  }));

  pruefe("antwort: fehlt → falsch (ohne den richtigen Wert zu verraten) → richtig; Soll kommt aus dem aktuellen Netz", kapsel(() => {
    const inst = instanz("salon-terminal");
    const [, zIp, zGw] = Spiel.defVon(inst).ziele;
    erwarte.gleich(status(inst), ["BEFEHL_FEHLT", "ANTWORT_FEHLT", "ANTWORT_FEHLT"]);
    const soll = Spiel.antwortSoll(inst.netz, zIp);
    erwarte.passt(soll, /^192\.168\.1\.\d+$/, "Soll aus dem Netz");
    const falsch = Spiel.antwortSetzen(inst, zIp, "192.168.1.1");
    erwarte.gleich(falsch.grund, "ANTWORT_FALSCH");
    erwarte.falsch(falsch.text.includes(soll), "verrät die richtige Adresse nicht: " + falsch.text);
    erwarte.wahr(Spiel.antwortSetzen(inst, zIp, "  " + soll + " ").ok, "Leerzeichen egal");
    erwarte.wahr(Spiel.antwortSetzen(inst, zGw, Spiel.antwortSoll(inst.netz, zGw)).ok);
    /* ändert jemand die Adresse, gilt die alte Antwort nicht mehr – das Netz ist die Wahrheit */
    Spiel.aendern(inst, "IP ändern", n => Modell.setzen(n, "kasse", "if.eth0.ip", "192.168.1.66"));
    erwarte.gleich(status(inst)[1], "ANTWORT_FALSCH");
    erwarte.wahr(Spiel.antwortGleich("mac", "00-1A-2B-3C-4D-5E", "001a.2b3c.4d5e") && Spiel.antwortGleich("mac", "00:1a:2b:3c:4d:5e", "001A2B3C4D5E"), "MAC in jeder Schreibweise");
    erwarte.falsch(Spiel.antwortGleich("ip", "", ""), "leer ist nie richtig");
  }));

  pruefe("ticketBauen: nur Arbeitsziele erlaubt (Übung ohne Fehler) – ohne Fehler UND ohne Arbeitsziele weiter null", () => {
    const leer = Spiel.ticketBauen({id: "t-leer", vorlage: "lan", vSeed: 3, injektoren: [], ziele: []});
    erwarte.gleich(leer, null);
    const uebung = Spiel.ticketBauen({id: "t-uebung", vorlage: "lan", vSeed: 3, injektoren: [], ziele: [],
      zusatzZiele: [{typ: "befehl", geraet: "kasse", muster: "^ipconfig$", beispiel: "ipconfig", text: "ipconfig"}]});
    erwarte.wahr(uebung && uebung.ziele.length === 1 && uebung.ziele[0].typ === "befehl", JSON.stringify(uebung && uebung.ziele));
  });

  pruefe("Durchspiel: alle Terminal-Aufträge bestehen (E und AP2) – und ohne die Arbeit im Terminal nicht", kapsel(() => {
    const ids = DATEN.tickets.filter(t => t.art === "terminal").map(t => t.id);
    erwarte.gleich(ids.sort(), ["baeckerei-terminal", "buero-terminal", "salon-terminal"]);
    for (const niveau of ["E", "AP2"]) {
      const r = Spiel.testlauf({ids, niveau});
      erwarte.gleich(r.filter(x => !x.bestanden).map(x => x.id + ": " + x.fehler.join("; ")), [], niveau);
    }
    for (const id of ids) {
      const inst = instanz(id);
      Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);                   /* Netz repariert, aber nichts im Terminal getan */
      const ab = Spiel.abnahme(inst);
      erwarte.falsch(ab.bestanden, id + ": ohne Befehle/Antworten nicht bestanden");
      erwarte.wahr(ab.ergebnisse.filter(e => !e.ok).every(e => Spiel.istArbeitsziel(e.ziel)), id + ": offen sind nur Arbeitsziele");
    }
  }));

  pruefe("Lösung vorführen zeigt Terminal-Schritte mit Zeilen; die Funktionsprobe hat für Arbeitsziele einen Haken am Gerät", kapsel(() => {
    const inst = instanz("buero-terminal");
    const v = Spiel.vorfuehren(inst);
    erwarte.gleich(v.map(s => [s.art, s.zeilen]), [["terminal", ["sudo systemctl start apache2"]]]);
    Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
    Spiel.arbeitszieleErfuellen(inst);
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden, JSON.stringify(ab.ergebnisse.map(e => e.grund)));
    const zeilen = Spiel.szene(inst, ab);
    erwarte.gleich(zeilen.filter(z => Spiel.istArbeitsziel(z.ziel)).map(z => [z.art, z.ende, z.text]),
      [["haken", "srv", "Befehl ausgeführt"], ["haken", "srv", "Befehl ausgeführt"]]);
  }));
});
