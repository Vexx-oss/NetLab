"use strict";
/* ---------- Abnahme-Regression: Dienste und Drucker (2.1 S3, Architektur § 17.2) ----------
   B-Bericht § 3.4: Die Regression prüfte nur ICMP zwischen Endgeräten (pc/server/nas), max. 45 Paare.
   Drucker und Dienste (HTTP, DNS, DHCP, Druckfreigabe/Port 445) waren NIE Regression – ein Spieler konnte
   einen Webdienst oder die Druckfreigabe zerstören, ohne dass die Abnahme es merkte.
   Seit 2.1 S3 prüft sie zusätzlich Dienste und Drucker (aus vorhandenen Feldern running.dienste/if.eth0,
   KEINE neue Datenform). Diese Datei misst: ≥5 Dienst-/Drucker-Basen im echten Schreibbüro-Netz, jede
   Sabotage wird als Kollateralschaden erkannt, der echte Ticketweg bleibt unberührt. */
gruppe("Abnahme: Regression für Dienste und Drucker", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, gen: Spiel.generierte};
    try {
      Spiel._trocken = true; Spiel._lz = {}; Spiel.generierte = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; Spiel.generierte = alt.gen;
    }
  };
  /* Echtes Schreibbüro-Netz: Server mit HTTP/Dateifreigabe/DNS/DHCP, Drucker mit Druckdienst, zwei PCs. */
  const netzBuero = () => Spiel.vorlagen.buero.bauen(Zufall(101), {kunde: "schreibbuero"}).netz;
  const DEF = {ziele: [], regressionOhne: []};
  const basenText = basen => basen.map(b => b.text);

  pruefe("Startnetz Schreibbüro: mindestens 5 Dienst-/Drucker-Basen zusätzlich zu ICMP", () => {
    const n = netzBuero(), basen = Spiel.regressionsBasen(DEF, n), texte = basenText(basen).join(" | ");
    const dienst = basen.filter(b => /Druckfreigabe|Webdienst|Dateifreigabe|Namensauflösung|DHCP-Adresse/.test(b.text));
    erwarte.wahr(dienst.length >= 5, "nur " + dienst.length + " Dienst-/Drucker-Basen: " + texte);
    for (const muster of [/Druckfreigabe \(Port 9100\)/, /Webdienst \(HTTP\)/, /Dateifreigabe \(Port 445\)/, /Namensauflösung/, /DHCP-Adresse/])
      erwarte.wahr(dienst.some(b => muster.test(b.text)), "Basentyp fehlt: " + muster);
    erwarte.wahr(basen.some(b => /Erreichbarkeit/.test(b.text)), "ICMP-Paare bleiben Regression");
    erwarte.wahr(basen.length <= Spiel.REGRESSION_MAX, "Basen innerhalb REGRESSION_MAX: " + basen.length);
    erwarte.wahr(Spiel.REGRESSION_MAX >= 60, "REGRESSION_MAX wurde für Dienste angehoben: " + Spiel.REGRESSION_MAX);
    /* Der Drucker ist ein Endgerät (typ pc mit Dienst druck) – er muss als Ziel vorkommen. */
    erwarte.wahr(basen.some(b => b.ziel && b.ziel.nach === "drucker"), "Drucker-Endgerät ist Regressionsziel");
  });

  pruefe("Jede Sabotage an Dienst oder Drucker wird zum Kollateralschaden (5 Fälle)", () => {
    const n = netzBuero(), basen = Spiel.regressionsBasen(DEF, n);
    const start = basen.filter(b => (Spiel.zielPruefen(n, b.ziel) || {}).ok);
    erwarte.wahr(start.length >= 5, "passende Basen im gesunden Startnetz: " + start.length);
    const inst = {basis: start, netz: n, def: DEF, seed: 1, ticketId: null};
    const faelle = [
      {text: "Webdienst", sabotage: k => Modell.setzen(k, "srv", "dienste.http.an", false)},
      {text: "Dateifreigabe", sabotage: k => Modell.setzen(k, "srv", "dienste.datei.an", false)},
      {text: "Druckfreigabe", sabotage: k => Modell.setzen(k, "drucker", "dienste.druck.an", false)},
      {text: "Namensauflösung", sabotage: k => Modell.setzen(k, "srv", "dienste.dns.an", false)},
      {text: "DHCP-Adresse", sabotage: k => Modell.setzen(k, "srv", "dienste.dhcp.an", false)},
    ];
    for (const f of faelle) {
      const kopie = Modell.kopie(n);
      f.sabotage(kopie);
      const liste = Spiel.regressionPruefen(inst, kopie);
      const treffer = liste.find(r => !r.ok && String(r.text).includes(f.text));
      erwarte.wahr(!!treffer, f.text + " wurde NICHT als Kollateralschaden erkannt. Offen: " + JSON.stringify(liste.filter(r => !r.ok).map(r => r.text)));
    }
    erwarte.gleich(Spiel.regressionPruefen(inst, Modell.kopie(n)).filter(r => !r.ok), [], "ohne Sabotage kein Kollateralschaden");
  });

  pruefe("Echter Weg: Ticket-Instanz auf buero-Netz hat Dienst-Basislinie, Webdienst-Ausfall fällt auf", kapsel(() => {
    const t = (DATEN.tickets || []).find(x => x.vorlage === "buero");
    erwarte.wahr(!!t, "ein Handticket auf der Vorlage buero");
    const inst = Spiel.instanzErstellen({ticketId: t.id});
    const ab = Spiel.abnahme(inst, {neustartTest: false});
    erwarte.wahr(ab.regression.length >= 1, "Regression hat eine Basislinie: " + ab.regression.length);
    const netz = Modell.kopie(inst.netz);
    Modell.setzen(netz, "srv", "dienste.http.an", false);
    const liste = Spiel.regressionPruefen(inst, netz);
    erwarte.wahr(liste.some(r => !r.ok), "zerstörter Webdienst ist ein Kollateralschaden");
    erwarte.wahr(liste.filter(r => !r.ok).every(r => r.grund !== null || r.text), "Grund/Text je Kollateralschaden vorhanden");
  }));

  pruefe("Rückwärtskompatibel: gespeicherte Alt-Basis (reine ICMP-Paare) prüft weiter korrekt", () => {
    const n = netzBuero();
    const paare = Spiel.regressionsPaare(DEF, n);
    erwarte.wahr(paare.length >= 1, "ICMP-Paare vorhanden");
    const p = paare[0];
    const inst = {basis: [{von: p.von, nach: p.nach}], netz: n, seed: 1};   /* Alt-Form ohne ziel-Objekt */
    const gesund = Spiel.regressionPruefen(inst, Modell.kopie(n));
    erwarte.gleich(gesund.length, 1, "eine Alt-Basis geprüft");
    erwarte.wahr(gesund[0].ok !== false, "gesundes ICMP-Paar bleibt ok");
    const kaputt = Modell.kopie(n);
    const kabel = Modell.kabelAn(kaputt, p.nach, "eth0");                  /* echte Störung statt IP-Feld: DHCP-Clients hätten sonst weiter eine Adresse */
    erwarte.wahr(!!kabel, "Kabel des Zielgeräts gefunden");
    Modell.trennen(kaputt, kabel.kabel.id);
    const r = Spiel.regressionPruefen(inst, kaputt);
    erwarte.wahr(r[0].ok === false, "gebrochenes ICMP-Paar wird erkannt");
  });
});
