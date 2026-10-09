"use strict";
/* FEHLERTEXTE (src/spiel/fehlertexte.js, Baustein E):
   Jede Konsolen-Ausgabe bekommt einen Klartext-Satz nach Bildungsstand. Geprüft wird
     1. die Tabelle selbst (vollständig, eindeutig, jede Zeile über ihre eigene Probe erreichbar),
     2. der echte Weg (CLI.eingabe → Ausgabe → Spiel.fehlertext) mit allen fünf geforderten Fällen:
        „% Invalid input detected", unbekanntes Kommando, abgeschnittene Zeile, fehlende Adresse,
        unbekannter Modus – plus Windows- und Linux-Terminal,
     3. null bei leerer Ausgabe ohne Fehler und bei normaler Ausgabe (kein Hilfe-Kasten ohne Fehler),
     4. die vier Bildungsstufen (ausführlich · knapp · nur der Code) und das Verhalten ohne Baustein A.
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 2, § 4. */
gruppe("Spiel: Fehlertexte", () => {

  /* Ein kleines Netz wie in tests/cli-grundlagen.test.js: Router (IOS), Switch (IOS), PC (Windows), Server (Linux). */
  const netz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    return n;
  };
  const sitzung = (id, zeilen) => { const s = CLI.sitzung(netz(), id); for (const z of zeilen || []) CLI.eingabe(s, z); return s; };

  /* Der echte Weg: Zeile in die Konsole, dann deren Ergebnis an Spiel.fehlertext – genau so ruft die
     Oberfläche es auf (fehler = das ganze Ergebnis der Konsole, nicht nur ein Schalter). */
  const konsole = (s, zeile) => {
    const r = CLI.eingabe(s, zeile);
    return {r, t: Spiel.fehlertext({netz: s.netz, id: s.id, modus: s.modus, eingabe: zeile, fehler: r})};
  };
  const titel = (s, zeile) => { const {t} = konsole(s, zeile); return t && t.titel; };
  const eintrag = id => Spiel.FEHLERTEXTE.find(e => e.id === id);

  /* Kapsel wie in den übrigen spiel-Tests: eigener Stand, eigene Einstellungen, danach alles zurück.
     Wichtig für die Texte: die Tiefe hängt am Bildungsstand, und der gehört dem Menschen – nicht diesem
     Testlauf. Ohne Kapsel hinge die Erwartung davon ab, was ein anderer Test stehen lässt. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
    }
  };
  /* Test mit festgelegtem Bildungsstand – die langen Sätze gibt es nur bei „azubi“/„azubi-plus“. */
  const beiStufe = (id, fn) => kapsel(() => { Spiel.einstSetzen("stufe", id); fn(); });

  /* ---------------- 1. Die Tabelle ---------------- */

  pruefe("Tabelle: jede Zeile ist vollständig, eindeutig und nennt ihre Quelle", () => {
    erwarte.wahr(Spiel.FEHLERTEXTE.length >= 40, "der Katalog soll deutlich sein, ist aber " + Spiel.FEHLERTEXTE.length);
    const ids = new Set(), titelListe = new Set();
    for (const t of Spiel.FEHLERTEXTE) {
      erwarte.wahr(t.id && /^(ios|win|lin|curl|alle)-/.test(t.id), "id nach Bereich: " + t.id);
      erwarte.falsch(ids.has(t.id), "id doppelt: " + t.id); ids.add(t.id);
      erwarte.wahr(t.titel && t.titel.length >= 8, t.id + ": Titel fehlt oder ist zu kurz");
      erwarte.falsch(titelListe.has(t.titel), "Titel doppelt: " + t.titel); titelListe.add(t.titel);
      erwarte.wahr(t.erkennung instanceof RegExp, t.id + ": erkennung fehlt");
      /* „alle“ ist der ausdrückliche Joker des Auffang-Eintrags (Vertrag § 4, Feld `geraet`). */
      erwarte.wahr((t.art || []).every(a => ["alle", "ios", "fw", "host-windows", "host-linux"].includes(a)), t.id + ": unbekannter Bereich");
      erwarte.wahr((t.modus || []).every(m => typeof m === "string" && m.length), t.id + ": modus");
      for (const stufe of ["ausfuehrlich", "knapp", "nurcodes"]) {
        const w = t.text && t.text[stufe];
        const s = typeof w === "function" ? w({}, "") : w;
        erwarte.wahr(typeof s === "string" && s.trim().length >= 3, `${t.id}: text.${stufe} ist leer`);
      }
      erwarte.wahr(String(t.muster || "").trim().length, t.id + ": muster fehlt");
      erwarte.wahr(t.beispiel, t.id + ": beispiel fehlt");
      erwarte.wahr(String(t.quelle || "").length >= 8, t.id + ": quelle fehlt (kein erfundener Code)");
      erwarte.wahr(String(t.probe || "").trim().length >= 6, t.id + ": probe fehlt");
    }
  });

  pruefe("Tabelle: jede Zeile ist über ihre eigene Probe erreichbar (Reihenfolge = Vorrang)", () => {
    for (const t of Spiel.FEHLERTEXTE) {
      const r = Spiel.fehlertext({ausgabe: t.probe, eingabe: t.probeEingabe || "", fehler: true, art: (t.art || [])[0], modus: (t.modus || [])[0]});
      erwarte.wahr(r, t.id + ": die Probe löst überhaupt nichts aus");
      erwarte.gleich(r.titel, t.titel, t.id + " wird von einem früheren Eintrag verdeckt");
      erwarte.gleich(r.muster, String(t.muster), t.id + ": muster");
      erwarte.wahr(r.text.trim() && r.beispiel.trim(), t.id + ": text oder beispiel leer");
    }
  });

  /* Gemessen am 09.10.2026 über alle 82 Einträge: KEIN Eintrag passt auf den leeren String, und nur
     `alle-unbekannt` passt auf fremde Texte. Die drei eingegrenzten Einträge
     (`ios-user-erst-enable`, `ios-config-erst-do`, `ios-invalid`) passen NICHT auf beliebige Texte –
     sie greifen nur bei „Invalid input detected“ und werden über `eingabe`/`modus` unterschieden.
     (Ein früherer Filter `erkennung.test("")` war der Fehler: er prüfte den leeren String und nicht
     den fremden Text.) */
  pruefe("Tabelle: nur der Auffang-Eintrag passt auf fremde Texte – und er steht ganz hinten", () => {
    const fremd = ["Ein beliebiger Text ohne Bedeutung.", "Bitte warten …", "R1# show version\nCisco IOS Software, Version 15.2",
                   "Interface  IP-Address  OK? Method Status Protocol", "Zeit: 12:00 Uhr, alles in Ordnung."];
    for (const t of Spiel.FEHLERTEXTE) {
      const trifft = fremd.filter(x => t.erkennung.test(x));
      if (t.id === "alle-unbekannt") erwarte.gleich(trifft.length, fremd.length, "der Auffang passt auf alles");
      else erwarte.gleich(trifft, [], t.id + " passt auf fremden Text");
    }
    erwarte.gleich(Spiel.FEHLERTEXTE[Spiel.FEHLERTEXTE.length - 1].id, "alle-unbekannt", "der Auffang steht am Ende");
    /* Und er greift nur, wenn wirklich ein Fehler gemeldet ist. */
    erwarte.gleich(Spiel.fehlertext({ausgabe: "Ein beliebiger Text ohne Bedeutung.", fehler: false}), null);
    erwarte.gleich(Spiel.fehlertext({ausgabe: "Ein beliebiger Text ohne Bedeutung.", fehler: true}).titel, "Meldung ohne Katalogeintrag");
  });

  /* ---------------- 2. Der echte Weg (Wirkung vor Grün) ---------------- */

  pruefe("% Invalid input detected wird in Klartext erklärt", beiStufe("azubi", () => {
    const s = sitzung("r1", ["en", "conf t"]);
    const {r, t} = konsole(s, "ip adress 10.0.0.1");
    erwarte.wahr(r.fehler, "die Konsole meldet einen Fehler");
    erwarte.enthaelt(r.ausgabe, "% Invalid input detected at '^' marker.");
    erwarte.gleich(t.titel, "Falsches Wort an der markierten Stelle", "der Tippfehler im Befehlswort – nicht „do“ und nicht „enable“");
    erwarte.enthaelt(t.text, "Fragezeichen", "der Klartext sagt, wie man weiterkommt");
    erwarte.gleich(t.muster, eintrag("ios-invalid").muster);
  }));

  pruefe("Unbekanntes Kommando im Exec-Modus (Translating …)", beiStufe("azubi", () => {
    const s = sitzung("r1");
    const {r, t} = konsole(s, "hallo");
    erwarte.enthaelt(r.ausgabe, "% Unknown command or computer name");
    erwarte.gleich(t.titel, "Unbekanntes Kommando im Exec-Modus");
    erwarte.enthaelt(t.text, "Rechnernamen");
  }));

  pruefe("Abgeschnittene Zeile → % Incomplete command.", beiStufe("azubi", () => {
    const s = sitzung("r1", ["en", "conf t", "interface GigabitEthernet0/0"]);
    const {r, t} = konsole(s, "ip address");
    erwarte.gleich(r.ausgabe, "% Incomplete command.");
    erwarte.gleich(t.titel, "Die Zeile ist noch nicht vollständig");
    erwarte.enthaelt(t.text, "Leerzeichen");
  }));

  pruefe("Fehlende Adresse/Maske wird als eigene Ursache erkannt", () => {
    const s = sitzung("r1", ["en", "conf t", "interface GigabitEthernet0/0"]);
    const {r, t} = konsole(s, "ip address 10.0.0.1");
    erwarte.gleich(r.ausgabe, "% Incomplete command.", "die Konsole sagt nur „unvollständig“");
    erwarte.gleich(t.titel, "Bei „ip address“ fehlt die Maske", "die Eingabezeile unterscheidet die Ursache");
    erwarte.enthaelt(t.beispiel, "255.255.255.0");
    erwarte.enthaelt(t.muster, "<Maske>");
  });

  /* Gemessen am 09.10.2026 (user, priv, config): „quatsch?“ erreicht den Hilfe-Zweig (parser.js:423)
     und liefert „% Unrecognized command“; „quatsch ?“ mit Leerzeichen bricht schon vorher ab
     (parser.js:400–402) und liefert „% Invalid input detected“. Beide Ausgaben sind echt und haben
     einen eigenen Eintrag – die Eingabezeile entscheidet, welcher greift. */
  pruefe("Unbekannter Modus – IOS: „quatsch?“ und „quatsch ?“ sind zwei verschiedene Ausgaben", () => {
    for (const modus of ["user", "priv", "config"]) {
      const s = sitzung("r1", modus === "user" ? [] : modus === "priv" ? ["en"] : ["en", "conf t"]);
      const ohne = konsole(s, "quatsch?");
      erwarte.gleich(ohne.r.ausgabe, "% Unrecognized command", modus + ": Fragezeichen ohne Leerzeichen");
      erwarte.gleich(ohne.t.titel, "Unbekanntes Wort in der Hilfe", modus);
      const mit = konsole(s, "quatsch ?");
      erwarte.enthaelt(mit.r.ausgabe, "% Invalid input detected");
      erwarte.gleich(mit.t.titel, "Falsches Wort an der markierten Stelle", modus + ": mit Leerzeichen");
    }
  });

  pruefe("Unbekannter Modus – Linux (ip, systemctl) und Windows (netsh)", () => {
    const srv = sitzung("srv1");
    erwarte.gleich(titel(srv, "ip quatsch"), "Unbekanntes ip-Kommando oder Objekt");
    erwarte.gleich(titel(srv, "ip address quatsch"), "Unbekanntes ip-Kommando oder Objekt");
    erwarte.gleich(titel(srv, "systemctl quatsch apache2"), "systemctl: unbekanntes Verb");
    const pc = sitzung("pc1");
    erwarte.gleich(titel(pc, "netsh interface ip quatsch"), "Diesen netsh-Befehl gibt es nicht");
  });

  pruefe("Falscher Modus mit richtigem Befehl (erst enable, dann do)", () => {
    const user = sitzung("r1");
    erwarte.gleich(titel(user, "conf t"), "Dafür fehlt der privilegierte Modus");
    const conf = sitzung("r1", ["en", "conf t"]);
    const {r, t} = konsole(conf, "show ip interface brief");
    erwarte.enthaelt(r.ausgabe, "% Invalid input detected");
    erwarte.gleich(t.titel, "Anzeigebefehl im Konfigurationsmodus");
    erwarte.enthaelt(t.muster, "do show");
  });

  pruefe("Endgeräte – Windows (cmd/PowerShell) und Linux (bash)", () => {
    const pc = sitzung("pc1");
    erwarte.gleich(titel(pc, "show ip interface brief"), "Diesen Befehl kennt die Eingabeaufforderung nicht");
    erwarte.gleich(titel(pc, "ipconfig /quatsch"), "Unbekannte ipconfig-Option");
    erwarte.gleich(titel(pc, "ping"), "ping ohne Ziel");
    CLI.eingabe(pc, "powershell");
    erwarte.gleich(titel(pc, "quatsch"), "PowerShell-Befehl in der Eingabeaufforderung");

    const srv = sitzung("srv1");
    erwarte.gleich(titel(srv, "ifconfig"), "Diesen Befehl kennt die Shell nicht");
    erwarte.gleich(titel(srv, "ip addr add 192.168.1.5/24 dev eth0"), "Ändern braucht Root-Rechte");
    erwarte.gleich(titel(srv, "sudo ip addr add 192.168.1.5 dev eth0"), "Bei „ip addr add“ fehlt das Präfix");
    erwarte.gleich(titel(srv, "ping"), "Ziel fehlt (ping oder traceroute)");
    erwarte.gleich(titel(srv, "cat /etc/passwd"), "Diese Datei gibt es nicht");
  });

  pruefe("Passwort dreimal falsch → % Bad secrets", beiStufe("azubi", () => {
    const s = sitzung("r1", ["en", "conf t", "enable secret Geheim1", "end", "disable"]);
    CLI.eingabe(s, "enable");
    CLI.eingabe(s, "falsch"); CLI.eingabe(s, "falsch");
    const {r, t} = konsole(s, "falsch");
    erwarte.gleich(r.ausgabe, "% Bad secrets");
    erwarte.gleich(t.titel, "Passwort dreimal falsch");
    erwarte.enthaelt(t.text, "Groß- und Kleinschreibung");
  }));

  pruefe("Unbekannter DHCP-Pool und unbekannter Dienst (IOS/Linux)", () => {
    const r1 = sitzung("r1", ["en", "conf t"]);
    erwarte.gleich(titel(r1, "no ip dhcp pool GAST"), "Diesen DHCP-Pool gibt es nicht");
    const srv = sitzung("srv1");
    erwarte.gleich(titel(srv, "systemctl status apache3"), "Diesen Dienst (Unit) gibt es nicht");
  });

  /* ---------------- 3. Kein Hilfe-Kasten ohne Fehler ---------------- */

  pruefe("Ohne Ausgabe und ohne Fehler kommt null", () => {
    erwarte.gleich(Spiel.fehlertext({ausgabe: "", fehler: false}), null);
    erwarte.gleich(Spiel.fehlertext({ausgabe: "   \n ", fehler: false}), null);
    erwarte.gleich(Spiel.fehlertext({}), null);
    erwarte.gleich(Spiel.fehlertext(), null);
    erwarte.gleich(Spiel.fehlertext(null), null);
  });

  pruefe("Normale Ausgaben ohne Fehler kommen als null zurück (kein Hilfe-Kasten bei Erfolg)", () => {
    const s = sitzung("r1", ["en"]);
    for (const zeile of ["show version", "show ip interface brief", "show running-config", "show ip route"]) {
      const {r, t} = konsole(s, zeile);
      erwarte.falsch(r.fehler, zeile + " ist kein Fehler");
      erwarte.wahr(r.ausgabe.trim().length, zeile + " liefert eine Ausgabe");
      erwarte.gleich(t, null, zeile + " darf keinen Fehlertext auslösen");
    }
    const pc = sitzung("pc1");
    for (const zeile of ["ipconfig /all", "help", "systeminfo"]) {
      const {r, t} = konsole(pc, zeile);
      erwarte.falsch(r.fehler, zeile + " ist kein Fehler");
      erwarte.gleich(t, null, zeile + " darf keinen Fehlertext auslösen");
    }
  });

  pruefe("Der Bereich filtert streng – aber ein unbekannter Bereich macht nicht blind", () => {
    const text = "                    ^\n% Invalid input detected at '^' marker.";
    const windows = 'Der Befehl "show" ist entweder falsch geschrieben oder\nkonnte nicht gefunden werden.';
    erwarte.gleich(Spiel.fehlertext({ausgabe: text, fehler: true, art: "ios"}).titel, "Falsches Wort an der markierten Stelle");
    erwarte.gleich(Spiel.fehlertext({ausgabe: text, fehler: false, art: "host-linux"}), null, "fremder Bereich ohne Fehler: null");
    /* „host“ ist der Wert, den die Sitzung aus parser.js liefert – er meint beide Endgeräte. */
    erwarte.gleich(Spiel.fehlertext({ausgabe: windows, fehler: true, art: "host"}).titel, "Diesen Befehl kennt die Eingabeaufforderung nicht");
    /* Steht der Bereich fest und passt nichts, kommt lieber null als eine fremde Erklärung. */
    erwarte.gleich(Spiel.fehlertext({ausgabe: windows, fehler: true, art: "ios"}), null, "IOS bekommt keine Windows-Erklärung");
    /* Unbekannter Bereich, unbekannter Modus, fehlendes Netz: keine Ausnahme, keine falsche Erklärung. */
    erwarte.gleich(Spiel.fehlertext({ausgabe: text, fehler: true, art: "gibtsnicht", modus: "gibtsnicht"}).titel, "Falsches Wort an der markierten Stelle");
    erwarte.gleich(Spiel.fehlertext({ausgabe: text, fehler: true, netz: null, id: null}).titel, "Falsches Wort an der markierten Stelle");
    erwarte.gleich(Spiel.fehlertext({ausgabe: text, fehler: true, netz: {geraete: {}}, id: "weg"}).titel, "Falsches Wort an der markierten Stelle");
  });

  pruefe("Art und Beispiel kommen aus netz und id (Vertrag: {netz, id})", () => {
    const windows = 'Der Befehl "show" ist entweder falsch geschrieben oder\nkonnte nicht gefunden werden.';
    const linux = "-bash: ifconfig: command not found";
    /* Ohne art: aus dem Gerät abgeleitet – der PC ist ein Windows-Terminal, der Server ein Linux-Terminal. */
    erwarte.gleich(Spiel.fehlertext({ausgabe: windows, fehler: true, netz: netz(), id: "pc1"}).titel, "Diesen Befehl kennt die Eingabeaufforderung nicht");
    erwarte.gleich(Spiel.fehlertext({ausgabe: windows, fehler: true, netz: netz(), id: "srv1"}), null, "der Server ist Linux – die Windows-Meldung passt nicht");
    erwarte.gleich(Spiel.fehlertext({ausgabe: linux, fehler: true, netz: netz(), id: "srv1"}).titel, "Diesen Befehl kennt die Shell nicht");
    /* Das Beispiel nennt einen Port, den es auf diesem Gerätetyp wirklich gibt. */
    const inval = "   ^\n% Invalid input detected at '^' marker.";
    erwarte.gleich(Spiel.fehlertext({ausgabe: inval, fehler: true, netz: netz(), id: "sw1"}).beispiel, "interface FastEthernet0/1 ?");
    erwarte.gleich(Spiel.fehlertext({ausgabe: inval, fehler: true, netz: netz(), id: "r1"}).beispiel, "interface GigabitEthernet0/0 ?");
  });

  /* ---------------- 4. Die vier Bildungsstufen ---------------- */

  pruefe("Die Tiefe kommt aus Spiel.stufe.text: azubi ausführlich · geselle knapp · meister nur der Code", kapsel(() => {
    const e = eintrag("ios-invalid");
    const frage = () => Spiel.fehlertext({ausgabe: "   ^\n% Invalid input detected at '^' marker.", fehler: true});
    Spiel.einstSetzen("stufe", "azubi");
    erwarte.gleich(frage().text, e.text.ausfuehrlich, "azubi");
    Spiel.einstSetzen("stufe", "azubi-plus");
    erwarte.gleich(frage().text, e.text.ausfuehrlich, "azubi-plus");
    Spiel.einstSetzen("stufe", "geselle");
    erwarte.gleich(frage().text, e.text.knapp, "geselle");
    Spiel.einstSetzen("stufe", "meister");
    erwarte.gleich(frage().text, e.text.nurcodes, "meister sieht nur den Code");
    erwarte.gleich(frage().text, "% Invalid input detected at '^' marker.");
    /* Muster und Beispiel bleiben auf jeder Stufe gleich – nur der Satz wächst. */
    erwarte.gleich(frage().muster, e.muster);
  }));

  pruefe("Ohne Baustein A (kein Spiel.stufe) gilt „ausfuehrlich“ – und nichts wirft", () => {
    const alt = Spiel.stufe;
    const probe = "   ^\n% Invalid input detected at '^' marker.";
    try {
      delete Spiel.stufe;
      erwarte.gleich(typeof Spiel.stufe, "undefined", "Spiel.stufe ist für diesen Test weg");
      erwarte.gleich(Spiel.fehlertext({ausgabe: probe, fehler: true}).text, eintrag("ios-invalid").text.ausfuehrlich);
    } finally { Spiel.stufe = alt; }
    erwarte.wahr(typeof Spiel.stufe.text === "function", "Spiel.stufe ist wieder da");
    erwarte.gleich(Spiel.fehlertext({ausgabe: probe, fehler: true}).titel, "Falsches Wort an der markierten Stelle");
  });

  pruefe("Deterministisch: gleiche Eingabe, gleiches Ergebnis", () => {
    const lage = {ausgabe: "RTNETLINK answers: Operation not permitted", fehler: true, art: "host-linux"};
    const a = Spiel.fehlertext(lage), b = Spiel.fehlertext(lage);
    erwarte.gleich(a, b);
    erwarte.gleich(a.titel, "Ändern braucht Root-Rechte");
  });
});
