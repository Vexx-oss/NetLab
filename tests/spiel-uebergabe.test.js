"use strict";
/* ÜBERGABE (Fahrplan 1.3/2.0, Schritt 0): „Ein Rechner, viele Azubis“.
   Gebaut 09.10.2026, gehärtet 09.10.2026 (task-1). Kapsel wie tests/spiel-bogen.test.js: echter
   Speicher, echter Neustart über Spiel.laden, danach ist alles wie vorher.

   DER BEFUND, DEN DIESE DATEI FESTHÄLT (zuerst gemessen, dann gebaut):
   `src/ui/spiel.js:aktiveLaden()` öffnet beim Start `Spiel.aktiveInstanz()` — vor der Übergabe
   gab es keinen Weg, den Rechner zu übergeben: der zweite Azubi steckte im offenen Auftrag des
   ersten. Der erste Test prüft genau diese Ausgangslage, damit sie nicht unbemerkt zurückkommt.

   DIE DREI FRAGEN AUS DEM AUFTRAG, JEDE MIT EINEM FALL BEWIESEN:
   1. Reihenfolge (`L.reset()` VOR `Spiel.laden()`): Fall „Reihenfolge“ — mit einem Spion auf
      `Spiel.postfachAuffuellen` (das `Spiel.laden` aufruft) und einer FEHLPROBE, die zeigt, dass
      der Spion die vertauschte Reihenfolge wirklich bemerkt.
   2. Wird `Spiel._lz` gebraucht? Gemessen: die Zeile `Spiel._lz = {}` in `uebergabe.js` war
      doppelt (`Spiel.neu` zustand.js:178 und `Spiel.laden` zustand.js:161 leeren selbst) und ist
      gestrichen. Die WIRKUNG hält der Fall „Laufzeitdaten“ fest — samt Fehlprobe, dass
      `Spiel.startNetzVon` ein fremdes Startnetz ungeprüft zurückgäbe.
   3. Bleibt ein offener Auftrag zurück? Fall 2: `Spiel.st.aktiv` ist null, die alte Instanz ist
      nicht mehr im Postfach, und die Übergabe meldet es in `nachher.aktiv`. */
gruppe("Spiel: Übergabe", () => {
  const T0 = Date.UTC(2026, 9, 9, 9, 0, 0);
  const kapsel = fn => () => {
    const altSpeicher = store.alles(), altLern = tief(L.st), altSt = Spiel._st, altEinst = Spiel._einst, uhr = jetzt();
    const altGen = Object.assign({}, Spiel.generierte);
    try {
      jetzt.setzen(T0);
      store.set("einst", {});
      Spiel._einst = null;
      Spiel.neu();
      fn();
    } finally {
      Spiel.generierte = altGen;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altSpeicher);
      const s = L.st; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, altLern);
      Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = {};
      jetzt.setzen(uhr); jetzt.frei();
    }
  };
  /* Einen benutzten Rechner herstellen: Geld, Ruf, ein erledigtes Ticket, ein OFFENER Auftrag,
     und ein Lernstand, den der Lernmotor wirklich mitschreibt. */
  const benutzen = () => {
    Spiel.gutschreiben(120, 7, "Testauftrag");
    const inst = Spiel.instanzErstellen({ticketId: "salon-01", quelle: "postfach"});
    Spiel.oeffnen(inst.iid);
    Spiel.st.erledigt.push({iid: 1, ticketId: "salon-01", t: jetzt(), sterne: 5});
    Spiel.speichern();
    L.ueben("lab.link", true);
    return inst;
  };

  pruefe("Ausgangslage: ein benutzter Rechner hat einen offenen Auftrag — genau das war das Problem", kapsel(() => {
    const inst = benutzen();
    erwarte.wahr(Spiel.aktiveInstanz() && Spiel.aktiveInstanz().iid === inst.iid, "offener Auftrag vorhanden");
    erwarte.wahr(Spiel.st.euro > 0, "Geld da");
    erwarte.wahr(Spiel.st.erledigt.length > 0, "erledigte Tickets da");
  }));

  pruefe("Übergabe: der nächste Azubi bekommt einen leeren Rechner (kein offener Auftrag)", kapsel(() => {
    const inst = benutzen();
    const r = Spiel.uebergabe();
    erwarte.wahr(r.ok, "Übergabe gelungen");
    erwarte.gleich(Spiel.aktiveInstanz(), null, "kein offener Auftrag mehr");
    erwarte.gleich(Spiel.st.aktiv, null, "auch im Spielstand steht keiner mehr");
    /* Die alte INSTANZ ist weg — nicht nur ihre iid: `naechsteIid` beginnt wieder bei 1, die iid
       allein beweist also nichts. Deshalb wird das Objekt selbst gesucht. */
    erwarte.gleich(Spiel.st.postfach.includes(inst), false, "die alte Instanz liegt nicht mehr im Postfach");
    erwarte.gleich(r.nachher.aktiv, null, "die Übergabe meldet den freien Rechner");
    erwarte.gleich(Spiel.st.euro, 0, "Geld zurückgesetzt");
    erwarte.gleich(Spiel.st.ruf, 0, "Ruf zurückgesetzt");
    erwarte.gleich(Spiel.st.erledigt, [], "erledigte Tickets geleert");
    erwarte.gleich(Spiel.st.stufe, 1, "Karriere-Stufe zurück auf 1");
    erwarte.gleich(r.vorher.euro > 0, true, "die Übergabe kennt den vorherigen Stand");
  }));

  pruefe("Übergabe: das Postfach ist wieder gefüllt — der nächste Azubi kann sofort anfangen", kapsel(() => {
    benutzen();
    Spiel.uebergabe();
    erwarte.wahr(Spiel.postfach().length > 0, "Postfach gefüllt");
    const offen = Spiel.offen();
    erwarte.wahr(offen >= 1, "mindestens ein offenes Ticket");
  }));

  pruefe("Übergabe: der LERNSTAND bleibt (er gehört dem Lernmotor, nicht dem Spielstand)", kapsel(() => {
    benutzen();
    const vorher = L.box("lab.link");
    erwarte.wahr(vorher > 0, "der Lernmotor hat den Kasten gehoben");
    const r = Spiel.uebergabe();                       /* Standard: behalten */
    erwarte.gleich(r.lernstandBehalten, true, "Standard ist behalten");
    erwarte.gleich(L.box("lab.link"), vorher, "Kasten unverändert");
    /* Die Einheit im Lernmotor zählt `r` (richtig) und `f` (falsch) — nicht „versuche".
       Gemessen in fremd/lernmotor.js:50: `{box:0, due:null, r:0, f:0, last:null, sf:0}`. */
    erwarte.wahr(L.st.units["lab.link"] && L.st.units["lab.link"].r > 0, "die richtigen Versuche bleiben");
  }));

  pruefe("Übergabe mit lernstandBehalten:false löscht den Lernstand — und zwar so, dass der Motor es merkt", kapsel(() => {
    benutzen();
    erwarte.wahr(L.box("lab.link") > 0, "vorher: Kasten gehoben");
    const r = Spiel.uebergabe({lernstandBehalten: false});
    erwarte.gleich(r.lernstandBehalten, false, "gemeldet: nicht behalten");
    erwarte.gleich(L.box("lab.link"), 0, "Kasten zurück auf 0");
    erwarte.gleich(Object.keys(L.st.units), [], "keine Einheiten mehr");
    erwarte.gleich(L.st.log, [], "kein Verlauf mehr");
    /* DER PUNKT: der Speicher ist geleert, nicht nur die Anzeige. Wer den Schlüssel von außen
       löscht, statt L.reset() zu rufen, verliert diese Zusage (fremd/lernmotor.js:39-40 hält
       den Stand im Verschluss). */
    erwarte.gleich(store.get("lern", null) && store.get("lern").units, {}, "auch der Speicher ist leer");
    /* Und die Wirkung fürs Lernen: der Motor fängt wieder bei Kasten 0 an, nicht bei 1. */
    erwarte.gleich(L.ueben("lab.link", true).vorher, 0, "der nächste richtige Versuch startet bei 0");
  }));

  pruefe("Übergabe: die Einstellungen bleiben (Bildungsstand, Klang, Leiste)", kapsel(() => {
    Spiel.einstSetzen("stufe", "geselle");
    Spiel.einstSetzen("ton", "aus");
    const r = Spiel.uebergabe();
    erwarte.wahr(r.ok, "Übergabe gelungen");
    erwarte.gleich(Spiel.einst.stufe, "geselle", "Bildungsstand bleibt");
    erwarte.gleich(Spiel.einst.ton, "aus", "Klang-Einstellung bleibt");
    /* Auch im Speicher, nicht nur im Zwischenspeicher: ein Neuladen darf sie nicht verlieren. */
    erwarte.gleich(store.get("einst", {}).stufe, "geselle", "der Speicher kennt den Bildungsstand noch");
  }));

  pruefe("Übergabe: zweimal hintereinander ist kein Fehler (der nächste Azubi kommt ja auch)", kapsel(() => {
    benutzen();
    const a = Spiel.uebergabe();
    const b = Spiel.uebergabe();
    erwarte.wahr(a.ok && b.ok, "beide gelungen");
    erwarte.gleich(Spiel.st.euro, 0, "immer noch leer");
    erwarte.gleich(Spiel.aktiveInstanz(), null, "immer noch kein offener Auftrag");
  }));

  pruefe("Übergabe: ohne Lernmotor wird lernstandBehalten:false EHRLICH abgelehnt, nicht stumm ausgeführt", kapsel(() => {
    /* Den Motor für die Dauer des Aufrufs wegnehmen — die Zusage „Lernstand gelöscht" wäre sonst
       nicht einlösbar, und ein stummer Erfolg wäre genau die Sorte Lüge, die dieses Projekt nicht will.
       Wichtig: der Rechner ist hier WIRKLICH benutzt, sonst prüft der Fall nichts. */
    const inst = benutzen();
    const box = L.box("lab.link");
    const echt = L.reset;
    let r;
    try { delete L.reset; r = Spiel.uebergabe({lernstandBehalten: false}); }
    finally { L.reset = echt; }
    erwarte.gleich(r.ok, false, "abgelehnt");
    erwarte.enthaelt(r.grund, "Lernstand", "der Grund nennt den Lernstand");
    erwarte.wahr(Spiel.st.euro > 0, "das Geld ist unangetastet");
    erwarte.gleich(Spiel.st.aktiv, inst.iid, "der offene Auftrag ist noch offen");
    erwarte.gleich(Spiel.aktiveInstanz() && Spiel.aktiveInstanz().iid, inst.iid, "auch über Spiel.aktiveInstanz");
    erwarte.gleich(L.box("lab.link"), box, "der Lernstand ist unangetastet");
    erwarte.gleich(Spiel.uebergabeLetzte(), null, "keine Übergabe-Spur geschrieben");
  }));

  pruefe("Übergabe: sie steht im Spielstand, damit die Oberfläche sie zeigen kann", kapsel(() => {
    Spiel.uebergabe({lernstandBehalten: false});
    const u = Spiel.uebergabeLetzte();
    erwarte.wahr(u && u.t === jetzt(), "Zeitpunkt der Übergabe");
    erwarte.gleich(u.lernstandBehalten, false, "mit der Entscheidung");
    /* Und sie überlebt das Neuladen — sonst könnte die nächste Stunde sie nicht anzeigen. */
    Spiel.laden();
    erwarte.gleich(Spiel.uebergabeLetzte() && Spiel.uebergabeLetzte().lernstandBehalten, false, "nach dem Laden noch da");
  }));

  pruefe("Übergabe: ein frischer Rechner hat keine Übergabe-Spur", kapsel(() => {
    erwarte.gleich(Spiel.uebergabeLetzte(), null, "keine Übergabe");
  }));

  /* ---------- Die drei Fragen aus dem Auftrag ---------- */

  pruefe("Reihenfolge: als Spiel.laden das Postfach füllte, war der Lernstand schon leer", kapsel(() => {
    benutzen();
    erwarte.wahr(L.box("lab.link") > 0, "vorher: der Vorgänger hat gelernt");
    const echt = Spiel.postfachAuffuellen, gesehen = [];
    /* `Spiel.laden` ruft `Spiel.postfachAuffuellen` (zustand.js:164) — und genau dort entscheidet
       der Lernstand mit, was nachkommt (`L.faelligeIds`, postfach.js:199). Der Spion misst den
       Lernstand IN diesem Moment. */
    Spiel.postfachAuffuellen = function(o){ gesehen.push(L.box("lab.link")); return echt.call(Spiel, o); };
    try { Spiel.uebergabe({lernstandBehalten: false}); } finally { Spiel.postfachAuffuellen = echt; }
    erwarte.gleich(gesehen.length, 1, "das Postfach wird beim Laden genau einmal gefüllt");
    erwarte.gleich(gesehen, [0], "in diesem Moment war der Lernstand bereits leer");

    /* FEHLPROBE: derselbe Ablauf mit vertauschter Reihenfolge (erst laden, dann löschen) — der
       Spion sieht dann den alten Lernstand. Das beweist, dass dieser Fall die Reihenfolge WIRKLICH
       misst und nicht bloß, dass irgendwo `L.reset` aufgerufen wird. */
    benutzen();
    const gesehen2 = [];
    Spiel.postfachAuffuellen = function(o){ gesehen2.push(L.box("lab.link")); return echt.call(Spiel, o); };
    try { Spiel.neu(); L.reset(); } finally { Spiel.postfachAuffuellen = echt; }
    erwarte.gleich(gesehen2.length, 1, "auch hier genau ein Füllen");
    erwarte.wahr(gesehen2[0] > 0, "vertauscht: beim Laden stand der alte Lernstand noch da — der Spion sieht es");
  }));

  pruefe("Laufzeitdaten: nach der Übergabe hängt an keiner iid mehr etwas vom Vorgänger", kapsel(() => {
    const alt = benutzen();
    Spiel.laufzeit(alt);
    const altStart = Spiel.startNetzVon(alt);          /* Verlauf und Startnetz des Vorgängers anlegen */
    erwarte.wahr(Object.keys(Spiel._lz).length > 0, "vorher: Laufzeitdaten des Vorgängers");
    const r = Spiel.uebergabe();
    erwarte.gleich(Object.keys(Spiel._lz), [], "nachher: keine Laufzeitdaten mehr");
    erwarte.gleich(r.nachher.lz, 0, "die Übergabe meldet es auch");
    /* `naechsteIid` beginnt wieder vorn (zustand.js:36; das frische Postfach vergibt gleich die
       ersten Nummern) — dieselben iids kommen also erneut vor. Gemessen: der Zähler steht nach der
       Übergabe nicht auf 1, sondern auf 3, weil `Spiel.laden` das Postfach mit zwei Instanzen
       füllt (i1, i2). Deshalb wird die Wiederverwendung hier DIREKT nachgewiesen, statt eine Zahl
       zu raten: so viele Instanzen anlegen, bis die alte Nummer wieder dran ist. */
    const altNr = +String(alt.iid).replace(/^i/, "");
    erwarte.wahr(Spiel.st.naechsteIid <= altNr,
      `die iid-Zählung steht wieder bei ${Spiel.st.naechsteIid} (Vorgänger war ${altNr}) — dieselben iids werden erneut vergeben`);
    let neu = null;
    const bis = Math.min(Math.max(0, altNr - Spiel.st.naechsteIid), 6);
    for (let k = 0; k <= bis && !neu; k++) {
      const x = Spiel.instanzErstellen({ticketId: "salon-02", quelle: "postfach"});
      if (x.iid === alt.iid) neu = x;
    }
    erwarte.wahr(!!neu, `die alte iid ${alt.iid} wird erneut vergeben (${bis + 1} Anläufe) — genau deshalb muss _lz leer sein`);
    erwarte.gleich(Spiel._lz[neu.iid], undefined, "unter der neu vergebenen iid steht nichts Fremdes");
    /* FEHLPROBE: `Spiel.startNetzVon` glaubt `_lz` blind (ticket.js:32-36) — läge dort noch das
       Startnetz des Vorgängers, käme es ungeprüft zurück. Das ist der Leak, den das Leeren verhindert. */
    Spiel._lz[neu.iid] = {netz: alt.netz, verlauf: [], startNetz: altStart};
    erwarte.gleich(Spiel.startNetzVon(neu), altStart, "ungelernt: das fremde Startnetz kommt ungeprüft zurück");
    delete Spiel._lz[neu.iid];
  }));

  pruefe("Übergabe: alles, was die Oberfläche als verloren ansagt, ist danach wirklich weg", kapsel(() => {
    /* Der Dialog in `src/ui/uebergabe.js:53` verspricht: „Geht verloren: Geld, Ruf, Aufträge,
       erledigte Tickets, Fehlerdex". Hier wird genau dieses Versprechen nachgemessen. */
    benutzen();
    Spiel.st.dex["kabel-fehlt"] = {gesehen: 2, verstanden: 1};
    Spiel.speichern();
    erwarte.gleich(Spiel.st.buch.length, 1, "vorher: eine Gutschrift im Buch");
    erwarte.wahr(!!Spiel.st.dex["kabel-fehlt"], "vorher: ein Eintrag im Fehlerdex");
    Spiel.uebergabe();
    erwarte.gleich({euro: Spiel.st.euro, ruf: Spiel.st.ruf, erledigt: Spiel.st.erledigt.length,
                    dex: Object.keys(Spiel.st.dex).length, buch: Spiel.st.buch.length, aktiv: Spiel.st.aktiv},
                   {euro: 0, ruf: 0, erledigt: 0, dex: 0, buch: 0, aktiv: null},
                   "Geld, Ruf, erledigte Tickets, Fehlerdex, Buch, offener Auftrag");
  }));

  pruefe("Die Datei, die hier läuft, hat LF-Zeilenenden", kapsel(() => {
    erwarte.wahr(typeof Spiel.uebergabe === "function" && typeof Spiel.uebergabeLetzte === "function", "beide Funktionen hängen an Spiel");
    if (typeof require !== "function") return;          /* Browser-Lauf: die Datei ist dort eingebettet, nicht auf der Platte */
    const quelle = require("fs").readFileSync(require("path").join(__dirname, "..", "src", "spiel", "uebergabe.js"), "utf8");
    erwarte.falsch(quelle.includes("\r"), "LF-Zeilenenden");
    erwarte.enthaelt(quelle, "Spiel.uebergabe = function", "die geladene Quelle ist diese Funktion");
  }));
});
