"use strict";
/* ERGEBNIS ALS TEXT (Fahrplan 1.3/2.0, Schritt 0): der Knopf „Ergebnis kopieren“.
   Kapsel wie tests/spiel-bogen.test.js: echter Speicher, echter Neustart über Spiel.laden,
   danach ist alles wie vorher.

   Was hier geprüft wird — und warum so:
   `Spiel.ergebnisText(inst, erg)` / `Spiel.ergebnisKurz(inst, erg)` sind eine ZUGESAGTE Schnittstelle
   (der Knopf in `src/ui/spiel.js` ruft sie). Geprüft wird der erzeugte TEXT, nicht die Anwesenheit
   einer Funktion: die Angaben (Auftrag, Ergebnis, Sterne, Fehler, Hilfen, Dauer, Fassung) müssen
   wirklich im Text stehen. Ebenso wichtig ist, was NICHT dasteht: ohne `erg` werden keine Sterne,
   kein Lohn und kein „Gelöst“ erfunden (AGENTS.md § 5), und der Aufruf verändert die Instanz nicht
   (`Spiel.abnahme` zählt `inst.abnahmen` hoch — es wird hier bewusst nicht gerufen). */
gruppe("Spiel: Ergebnis (Text)", () => {
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
  /* Auftrag erstellen (Vorgabe: salon-01, der Einstiegsauftrag) und öffnen */
  const auftrag = (ticketId = "salon-01") => {
    const inst = Spiel.instanzErstellen({ticketId, quelle: "postfach"});
    Spiel.oeffnen(inst.iid);
    return inst;
  };
  /* Gelöst und abgenommen: liefert `erg` genau so, wie `src/ui/spiel.js` es bekommt */
  const loesen = (ticketId) => {
    const inst = auftrag(ticketId);
    inst.zeitMs = 4 * 60 * 1000 + 12000;                 /* 4:12 — die Dauer, die im Text stehen muss */
    Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden, `${inst.ticketId} bestanden`);
    return {inst, def: Spiel.defVon(inst), ab, erg: Spiel.abschliessen(inst, ab)};
  };
  /* Nicht gelöst, aber abgenommen: der Fehlversuch */
  const fehlversuch = (ticketId) => {
    const inst = auftrag(ticketId);
    inst.zeitMs = 60000;
    const ab = Spiel.abnahme(inst);
    erwarte.falsch(ab.bestanden, "Fehlversuch");
    return {inst, def: Spiel.defVon(inst), ab, erg: Spiel.abschliessen(inst, ab)};
  };
  const zeile = (text, anfang) => text.split("\n").find(z => z.startsWith(anfang)) || "";

  pruefe("Bestandener Auftrag: der Text trägt Auftrag, Kunde, Niveau, Thema, Ergebnis, Sterne, Lohn, Dauer, Fassung", kapsel(() => {
    const {inst, def, ab, erg} = loesen();
    const text = Spiel.ergebnisText(inst, erg);
    const kunde = Spiel.kundenDaten(inst.kunde || def.kunde).name;
    erwarte.enthaelt(text, `Netzwerk-Labor · Fassung ${LABOR_VERSION}`, "Fassung");
    erwarte.enthaelt(text, `Auftrag: „${def.titel}“ · ${kunde} · ${Spiel.NIVEAU_NAME[ab.niveau]}`, "Auftrag, Kunde, Niveau");
    erwarte.enthaelt(text, `Thema: ${Spiel.skill(def.skills[0]).name}`, "Thema = Fertigkeit");
    erwarte.enthaelt(text, `Ergebnis: Gelöst · ${ab.ergebnisse.filter(e => e.ok).length} von ${ab.ergebnisse.length} Zielen erfüllt · ${Spiel.ergebnis.sterneText(erg.sterne)} (${Spiel.ergebnis.zahl(erg.sterne)} von 5) · +${eur(erg.euro)} € · +${erg.ruf} Ruf`, "Ergebnis-Zeile");
    erwarte.enthaelt(text, "Hilfen: keine", "ohne Hilfe gezogen");
    erwarte.enthaelt(text, "Dauer: 4:12 · Versuche: 1", "Dauer und Versuche");
    erwarte.enthaelt(text, "Fertig: " + Spiel.ergebnis.zeitpunkt(ab.zeit), "Fertig-Zeitpunkt");
    erwarte.wahr(text.split("\n").length >= 8, "mindestens acht Zeilen");
    erwarte.falsch(text.includes("\n\n"), "keine leere Zeile");
    erwarte.falsch(text.includes("\r"), "nur LF im Text");
  }));

  pruefe("Zweimal derselbe Text, und der Aufruf verändert die Instanz nicht (Spiel.abnahme zählt sonst hoch)", kapsel(() => {
    const {inst} = loesen();
    const vorher = JSON.stringify(inst), abnahmen = inst.abnahmen, zielErst = JSON.stringify(inst.zielErst);
    erwarte.gleich(abnahmen, 1, "die Abnahme hat einen Versuch gezählt");
    /* OHNE `erg`: der reine Weg — er muss die Ziele frisch prüfen, ohne etwas anzufassen */
    const a = Spiel.ergebnisText(inst);
    const b = Spiel.ergebnisText(inst);
    const c = Spiel.ergebnisKurz(inst);
    erwarte.gleich(a, b, "zweimal gleich");
    erwarte.wahr(c.length > 0, "Kurzfassung entsteht");
    erwarte.gleich(JSON.stringify(inst), vorher, "Instanz unverändert");
    erwarte.gleich(inst.abnahmen, abnahmen, "kein weiterer Abnahmeversuch gezählt");
    erwarte.gleich(JSON.stringify(inst.zielErst), zielErst, "zielErst unverändert");
    /* Auch eine NIE GEÖFFNETE Instanz (kein `niveau`): der Text darf nichts anlegen. Der frühere
       Weg über `Spiel.niveauVon` hätte `inst.niveau` und `inst.niveauWahl` geschrieben (lernen.js:34). */
    const roh = Spiel.instanzErstellen({ticketId: "salon-02", quelle: "postfach"});
    const rohVorher = JSON.stringify(roh);
    const rohText = Spiel.ergebnisText(roh);
    erwarte.wahr(rohText.length > 0, "Text entsteht auch ohne geöffneten Auftrag");
    erwarte.gleich(JSON.stringify(roh), rohVorher, "und legt nichts an der Instanz an");
    erwarte.gleich(zeile(rohText, "Auftrag: "), `Auftrag: „${Spiel.defVon(roh).titel}“ · ${Spiel.kundenDaten(roh.kunde).name}`, "ohne Niveau wird kein Niveau erfunden");
  }));

  pruefe("Ohne Ergebnis: keine erfundenen Sterne, kein Lohn, kein Gelöst — nur die Ziele, die wirklich erfüllt sind", kapsel(() => {
    const inst = auftrag();                               /* offen, nicht abgenommen */
    const ziele = Spiel.zieleStatus(inst), treffer = ziele.filter(z => z.ok === true).length;
    const text = Spiel.ergebnisText(inst), kurz = Spiel.ergebnisKurz(inst);
    erwarte.enthaelt(text, `Ergebnis: ${treffer} von ${ziele.length} Zielen erfüllt`, "nur der gemessene Zielstand");
    erwarte.falsch(text.includes("★"), "keine Sterne");
    erwarte.falsch(text.includes("Gelöst"), "kein Gelöst");
    erwarte.falsch(text.includes("€"), "kein Lohn");
    erwarte.falsch(text.includes("Fertig:"), "ohne Abnahme gibt es keinen Fertig-Zeitpunkt");
    erwarte.gleich(kurz, `Netzwerk-Labor · „${Spiel.defVon(inst).titel}“ · ${Spiel.kundenDaten(inst.kunde).name} · ${treffer}/${ziele.length} Ziele erfüllt · Hilfe 0`);
  }));

  pruefe("Fehlversuch: Noch nicht bestanden, keine Sterne, kein Lohn — aber die Fehler mit Kurzgrund stehen da", kapsel(() => {
    const {inst, erg} = fehlversuch();
    const text = Spiel.ergebnisText(inst, erg);
    const ergebnisZeile = zeile(text, "Ergebnis: ");
    const offen = erg.abnahme.ergebnisse.filter(e => !e.ok);
    erwarte.gleich(erg.bestanden, false, "Fehlversuch");
    erwarte.enthaelt(ergebnisZeile, "Noch nicht bestanden", "ehrliches Ergebnis");
    erwarte.falsch(ergebnisZeile.includes("★"), "keine Sterne in der Ergebnis-Zeile");
    erwarte.falsch(ergebnisZeile.includes("€"), "kein Lohn in der Ergebnis-Zeile");
    erwarte.wahr(offen.length > 0, "es gibt offene Ziele");
    for (const e of offen) {
      erwarte.enthaelt(zeile(text, "Fehler: "), e.ziel.text || e.ziel.typ, "das offene Ziel wird genannt");
      if (e.grund) erwarte.enthaelt(zeile(text, "Fehler: "), `(${Spiel.grundTitel(e.grund)})`, "mit Kurzgrund");
    }
    /* Und die lange Erklärung steht NICHT im kopierten Text — die gehört auf den Ergebnisbildschirm. */
    const lang = Spiel.grundText(offen[0].grund, erg.abnahme.niveau);
    if (lang) erwarte.falsch(text.includes(lang), "keine lange Erklärung im Kopiertext");
  }));

  pruefe("Hilfen: die höchste Stufe steht im Text, auch wenn kein Sprossen-Eintrag vorliegt (Altstand)", kapsel(() => {
    const inst = auftrag();
    inst.hilfeStufe = 4;                                  /* gezogen, aber kein Eintrag in `hilfen` (Stand vor task-19) */
    Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
    const erg = Spiel.abschliessen(inst, Spiel.abnahme(inst));
    const text = Spiel.ergebnisText(inst, erg);
    erwarte.enthaelt(text, "Hilfen: keine", "gezogene Einträge: keine");
    erwarte.enthaelt(text, "Hilfe: Bereich markiert", "der Abzug wird benannt");
    erwarte.wahr(erg.sterne < 5, "eine ungedeckte Hilfestufe kostet Sterne");
    erwarte.gleich(Spiel.ergebnisKurz(inst, erg).split(" · ").pop(), "Hilfe 4", "höchste Stufe in der Kurzfassung");
  }));

  pruefe("Eine GEDECKTE Sprosse (Vorrat) kostet nichts — eine ungedeckte kostet ½ Stern", kapsel(() => {
    const a = auftrag(); a.hilfeStufe = 4; a.hilfen = [{stufe: 4, frei: true}];     /* `Spiel.hilfe` markiert gedeckte Sprossen so (abnahme.js:58-75) */
    Spiel.loesung(a.netz, Spiel.defVon(a).loesung);
    const e1 = Spiel.abschliessen(a, Spiel.abnahme(a));
    const t1 = Spiel.ergebnisText(a, e1);
    erwarte.gleich(e1.abnahme.abzuege.filter(x => /Hilfe/.test(x.text)), [], "gedeckt: kein Hilfe-Abzug");
    erwarte.falsch(t1.includes("Abzüge:"), "gedeckt: keine Abzugszeile im Text");
    erwarte.enthaelt(t1, "Hilfen: 1 gezogen · höchste Stufe 4", "gezogene Hilfe steht im Text");

    const b = auftrag(); b.hilfeStufe = 4;                                           /* ungedeckt: kein Eintrag */
    Spiel.loesung(b.netz, Spiel.defVon(b).loesung);
    const e2 = Spiel.abschliessen(b, Spiel.abnahme(b));
    const t2 = Spiel.ergebnisText(b, e2);
    erwarte.gleich(e2.abnahme.abzuege.filter(x => x.text === "Hilfe: Bereich markiert"), [{text: "Hilfe: Bereich markiert", sterne: 0.5}], "ungedeckt: Abzug ½ Stern");
    erwarte.enthaelt(t2, "Abzüge: −½ ★ Hilfe: Bereich markiert", "der Abzug steht im Text");
    erwarte.wahr(e2.sterne <= e1.sterne, "die ungedeckte Sprosse kostet nie weniger als die gedeckte");
  }));

  pruefe("Kurzfassung: EINE Zeile mit Auftrag, Kunde, Ergebnis, Sternen, Dauer und Hilfe", kapsel(() => {
    const {inst, def, erg} = loesen();
    const kurz = Spiel.ergebnisKurz(inst, erg);
    erwarte.gleich(kurz.split("\n").length, 1, "eine Zeile");
    erwarte.gleich(kurz, `Netzwerk-Labor · „${def.titel}“ · ${Spiel.kundenDaten(inst.kunde || def.kunde).name} · Gelöst ${Spiel.ergebnis.sterneText(erg.sterne)} · 4:12 · Hilfe 0`);
    /* Und der Fehlversuch in Kurzform — ohne Sterne, mit der Zahl der erfüllten Ziele */
    const f = fehlversuch();
    erwarte.enthaelt(Spiel.ergebnisKurz(f.inst, f.erg), `Noch nicht bestanden (${f.erg.abnahme.ergebnisse.filter(e => e.ok).length}/${f.erg.abnahme.ergebnisse.length} Ziele)`, "Fehlversuch in Kurzform");
  }));

  pruefe("Der Fertig-Zeitpunkt stammt aus der ABNAHME, nicht aus dem Kopieren", kapsel(() => {
    const {inst, ab, erg} = loesen();
    const beiAbnahme = Spiel.ergebnis.zeitpunkt(ab.zeit);
    jetzt.weiter(60 * 60 * 1000);                         /* eine Stunde später kopiert */
    const text = Spiel.ergebnisText(inst, erg);
    erwarte.wahr(Spiel.ergebnis.zeitpunkt(jetzt()) !== beiAbnahme, "die Uhr steht wirklich anders");
    erwarte.enthaelt(text, "Fertig: " + beiAbnahme, "Zeitpunkt der Abnahme");
    erwarte.falsch(text.includes("Fertig: " + Spiel.ergebnis.zeitpunkt(jetzt())), "nicht der Zeitpunkt des Kopierens");
  }));

  pruefe("Ein Aufruf mit dem ERGEBNIS statt der Instanz wird toleriert (kein stiller Unsinn)", kapsel(() => {
    const {inst, erg} = loesen();
    erwarte.gleich(Spiel.ergebnisText(erg), Spiel.ergebnisText(inst, erg), "dasselbe Ergebnis");
    erwarte.gleich(Spiel.ergebnisKurz(erg), Spiel.ergebnisKurz(inst, erg), "dasselbe in Kurzform");
  }));

  pruefe("Unbrauchbarer Eingang liefert einen leeren Text statt eines Absturzes", kapsel(() => {
    erwarte.gleich(Spiel.ergebnisText(null), "", "null");
    erwarte.gleich(Spiel.ergebnisText({}), "", "leeres Objekt");
    erwarte.gleich(Spiel.ergebnisText(42), "", "Zahl");
    erwarte.gleich(Spiel.ergebnisText("salon-01"), "", "Text");
    erwarte.gleich(Spiel.ergebnisKurz(null), "", "Kurzfassung null");
    /* Ein Ticket, das es nicht gibt: kein Wurf, sondern nichts zu berichten */
    erwarte.gleich(Spiel.ergebnisText({iid: "i99", ticketId: "gibt-es-nicht", hilfen: []}), "", "unbekanntes Ticket");
  }));

  pruefe("Die Datei, die hier läuft, hat LF-Zeilenenden und berührt kein DOM", kapsel(() => {
    erwarte.wahr(typeof Spiel.ergebnisText === "function" && typeof Spiel.ergebnisKurz === "function", "beide Funktionen hängen an Spiel");
    if (typeof require !== "function") return;             /* Browser-Lauf: die Datei ist dort eingebettet, nicht auf der Platte */
    const quelle = require("fs").readFileSync(require("path").join(__dirname, "..", "src", "spiel", "ergebnis.js"), "utf8");
    erwarte.falsch(quelle.includes("\r"), "LF-Zeilenenden");
    erwarte.falsch(/\bdocument\b|\bwindow\b|\bnavigator\b/.test(quelle), "kein DOM-Zugriff");
    erwarte.enthaelt(quelle, "Spiel.ergebnisText = function", "die geladene Quelle ist diese Funktion");
  }));
});
