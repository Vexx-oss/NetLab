"use strict";
/* WIEDERHOLUNGSSPERRE (task-16): Minis und Aufträge dürfen sich nicht so schnell wiederholen.
   Daten/Verhalten: src/spiel/mini.js (Rotation + Sperrfenster) · src/spiel/mischer.js (Inhalt im Postfach).

   DER BEFUND, DEN DIESE DATEI OFFENLEGT (gemessen am 09.10.2026 über den echten Weg
   naechstes()+antworten(), 92 Minis, 27 Fertigkeiten):
     vorher  20 Runden → nur 11 verschiedene Minis, 9 Wiederholungen, kleinster Abstand 7 Runden.
     nachher 20 Runden → 20 verschiedene Minis, 0 Wiederholungen; 40 Runden → 40 verschiedene.
   Ursache war der Filter in `fuerSkill`: war „nicht in s.zuletzt“ leer, fiel er auf ALLE Minis der
   Fertigkeit zurück – und die haben meist nur 3–5 Minis.

   Geprüft wird:
     · Rotation je Fertigkeit: jedes Mini einmal, erst dann das am längsten nicht gespielte,
     · `naechstes()` überspringt eine gesperrte Fertigkeit und nimmt lieber die nächste,
     · Determinismus (gleicher Spielstand → gleiche Folge; kein Datum im Seed),
     · der Zustand liegt in st.mini, übersteht Migration/Neustart und alte Stände brechen nicht,
     · das Sperrfenster wird nicht durch eine feste Reihenfolge ausgehungert (alle Fertigkeiten kommen dran),
     · der Mischer legt nie zweimal denselben Inhalt ins offene Postfach,
     · die eingehängten generierten Fragen (task-18): fester Bestand unverändert, erschöpfte Fertigkeit
       liefert eine neue Frage, die über ihre ID wiedergefunden wird, Aufteilung 1:3 zugunsten der
       festen Rotation – samt dem gemessenen Befund zu Fertigkeiten mit nur AP2-Vorlagen. */

gruppe("Mini: Wiederholungssperre (task-16)", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.get("einst", null), uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe) Spiel.stufe.setzen("azubi", {still: true});
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
      jetzt.setzen(alt.uhr); jetzt.frei();
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && Spiel.stufe.setzen) Spiel.stufe.setzen("azubi", {still: true});
    }
  };
  /* Frischer Stand mitten im Test (für Vergleiche „zweimal dasselbe“). */
  const neu = (stufe = 99) => {
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = stufe;
    Spiel._lz = {}; Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe) Spiel.stufe.setzen("azubi", {still: true});
    return Spiel._st;
  };
  const antworten = id => { const m = Spiel.mini.von(id); return Spiel.mini.antworten(id, m.richtig); };
  /* Eine Runde über den echten Weg: naechstes() liefert, antworten() verbucht. */
  const runden = (n, {falsch = false} = {}) => {
    const folge = [];
    for (let i = 0; i < n; i++) {
      const m = Spiel.mini.naechstes();
      if (!m) break;
      folge.push(m.id);
      const a = falsch && (m.art === "wahl" || m.art === "vorhersage") ? (m.richtig + 1) % m.optionen.length : m.richtig;
      Spiel.mini.antworten(m.id, a);
    }
    return folge;
  };
  const wiederholungen = folge => {
    const gesehen = {}; let n = 0, direkt = 0, minAbstand = Infinity;
    folge.forEach((id, i) => {
      if (id in gesehen) { n++; const d = i - gesehen[id]; if (d < minAbstand) minAbstand = d; if (d === 1) direkt++; }
      gesehen[id] = i;
    });
    return {n, direkt, minAbstand: n ? minAbstand : null};
  };
  /* Die Kandidaten einer Fertigkeit so, wie die Auswahl sie sieht (Niveau-Vorliebe wie in fuerSkill). */
  const kandidaten = skill => {
    const kand = Spiel.mini.alle().filter(m => m.skill === skill);
    const passt = kand.filter(m => Spiel.mini.passtNiveau(m));
    return passt.length ? passt : kand;
  };

  pruefe("20 Runden: kein Mini zweimal (vorher 9 Wiederholungen bei 11 Minis)", kapsel(() => {
    const folge = runden(20);
    const w = wiederholungen(folge);
    erwarte.gleich(folge.length, 20, "zwanzig Runden gespielt");
    erwarte.gleich(w.n, 0, `Wiederholungen in 20 Runden: ${folge.join(" ")}`);
    erwarte.gleich(new Set(folge).size, 20, "zwanzig verschiedene Minis");
  }));

  pruefe("40 Runden: erst nach der vollen Runde wiederholt sich etwas", kapsel(() => {
    const folge = runden(40);
    const w = wiederholungen(folge);
    erwarte.gleich(folge.length, 40, "vierzig Runden gespielt");
    erwarte.gleich(w.n, 0, `Wiederholungen in 40 Runden: ${folge.join(" ")}`);
    erwarte.gleich(new Set(folge).size, 40, "vierzig verschiedene Minis");
  }));

  pruefe("Die Sperre hungert keine Fertigkeit aus: alle Fertigkeiten kommen dran", kapsel(() => {
    const folge = runden(120);
    const skills = new Set(folge.map(id => Spiel.mini.von(id).skill));
    const alle = new Set(Spiel.mini.alle().map(m => m.skill));
    erwarte.gleich(folge.length, 120, "hundertzwanzig Runden gespielt");
    erwarte.gleich([...alle].filter(s => !skills.has(s)), [], "diese Fertigkeiten kamen nie dran");
    /* Vorher blieb die Auswahl an den ersten sechs Fertigkeiten hängen (26 Minis in 120 Runden). */
    erwarte.wahr(new Set(folge).size >= 60, `nur ${new Set(folge).size} verschiedene Minis in 120 Runden`);
  }));

  pruefe("Rotation einer Fertigkeit: jedes Mini einmal, dann das am längsten nicht gespielte", kapsel(() => {
    const skill = "lab.ping";
    const kand = kandidaten(skill);
    erwarte.wahr(kand.length >= 3, `lab.ping hat ${kand.length} Kandidaten für dieses Niveau`);
    const folge = [];
    for (let i = 0; i < kand.length; i++) {
      const m = Spiel.mini.fuerSkill(skill);
      erwarte.wahr(!!m && m.skill === skill, `Runde ${i + 1}: kein Ping-Mini`);
      folge.push(m.id);
      antworten(m.id);
    }
    erwarte.gleich(new Set(folge).size, kand.length, `erst alle ${kand.length} Minis, dann Wiederholung: ${folge.join(" ")}`);
    /* Jetzt ist die Fertigkeit erschöpft: die Sperre meldet es, die Rotation nimmt das älteste. */
    erwarte.gleich(Spiel.mini.fuerSkill(skill, {gesperrt: true}), null, "erschöpft: die Sperre greift");
    const aeltestes = Spiel.mini.fuerSkill(skill);
    erwarte.gleich(aeltestes && aeltestes.id, folge[0], "die Wiederholung nimmt das am längsten nicht gespielte");
  }));

  pruefe("Kein Fertigkeitssprung ohne Not: eine andere Fertigkeit hat Vorrang", kapsel(() => {
    /* Eine Fertigkeit komplett ins Sperrfenster legen – ohne naechstes(), damit die Reihenfolge egal ist. */
    const gesperrt = "lab.link";
    for (const m of kandidaten(gesperrt)) antworten(m.id);
    const m = Spiel.mini.naechstes();
    erwarte.wahr(!!m, "es gibt trotzdem ein Mini");
    erwarte.falsch(m.skill === gesperrt, `naechstes() lieferte wieder ${gesperrt}: ${m.id}`);
    erwarte.gleich(Spiel.mini.gesperrt(m.id), false, "und zwar keines aus dem Sperrfenster");
  }));

  pruefe("Deterministisch: gleicher Spielstand ergibt dieselbe Folge", kapsel(() => {
    neu();
    const leer = JSON.parse(JSON.stringify(Spiel.mini.stand()));
    const a = runden(10);
    /* Denselben Stand noch einmal von vorn: dieselbe Folge. */
    neu(); Spiel._st.mini = JSON.parse(JSON.stringify(leer));
    const b = runden(10);
    erwarte.gleich(b, a, "zwei Läufe aus demselben Stand");
    /* Und aus zwei leeren Ständen derselbe Anfang (kein Math.random, kein Datum). */
    neu(); const c = runden(10);
    neu(); const d = runden(10);
    erwarte.gleich(d, c, "zwei leere Stände");
    erwarte.gleich(c, a, "derselbe Anfang wie oben");
  }));

  pruefe("Kein Datum im Seed: derselbe Stand wählt an zwei Tagen dasselbe", kapsel(() => {
    antworten(kandidaten("lab.ping")[0].id);
    const stand = JSON.parse(JSON.stringify(Spiel.st.mini));
    jetzt.setzen(Date.UTC(2026, 0, 15, 12));
    const a = Spiel.mini.fuerSkill("lab.ping");
    Spiel.st.mini = JSON.parse(JSON.stringify(stand));
    jetzt.setzen(Date.UTC(2026, 6, 15, 12));
    const b = Spiel.mini.fuerSkill("lab.ping");
    erwarte.wahr(!!a && !!b, "beide Male ein Mini");
    erwarte.gleich(b.id, a.id, "der Tag darf die Auswahl nicht ändern");
  }));

  pruefe("Der Zustand liegt in st.mini und übersteht einen Neustart (Migration)", kapsel(() => {
    runden(6);
    const s = Spiel.mini.stand();
    erwarte.wahr(typeof s.zug === "number" && s.zug >= 6, `zug steht im Spielstand (${s.zug})`);
    erwarte.gleich(Object.keys(s.gespielt).length >= 6, true, "gespielt steht im Spielstand");
    const kopie = Spiel.migrieren(JSON.parse(JSON.stringify(Spiel.st)));
    Spiel._st = kopie;
    const m = Spiel.mini.naechstes();
    erwarte.wahr(!!m, "nach der Migration gibt es ein Mini");
    erwarte.falsch(Spiel.mini.gesperrt(m.id), "und es wiederholt keine Frage aus dem Sperrfenster");
  }));

  pruefe("Alte Spielstände ohne die neuen Felder brechen nicht", kapsel(() => {
    /* So sah ein Stand vor dem Umbau aus: zuletzt + Zähler, kein zug, kein gespielt. */
    Spiel._st.mini = {aktuell: null, zuletzt: ["mini-link-1", "mini-link-2"], richtig: 1, falsch: 1};
    const s = Spiel.mini.stand();
    erwarte.gleich(s.zug, 2, "die Zugnummer kommt aus richtig+falsch");
    erwarte.gleich(s.gespielt["mini-link-1"], 1, "das älteste Fenster-Mini bekommt die kleinste Zugnummer");
    erwarte.gleich(s.gespielt["mini-link-2"], 2, "das jüngste die größere");
    const m = Spiel.mini.fuerSkill("lab.link");
    erwarte.gleich(m && m.id, "mini-link-3", "noch nie gespielt kommt zuerst");
    /* Kaputter Stand: nichts wirft. */
    Spiel._st.mini = {zuletzt: "kaputt", richtig: "x", falsch: null};
    const k = Spiel.mini.stand();
    erwarte.gleich(k.zuletzt, [], "kaputtes Fenster wird leer");
    erwarte.gleich([k.richtig, k.falsch, k.zug], [0, 0, 0], "Zähler werden Zahlen");
    erwarte.wahr(!!Spiel.mini.naechstes(), "und die Auswahl läuft weiter");
  }));

  pruefe("Mischer: ein schon offener Inhalt kommt nicht noch einmal in den Topf", kapsel(() => {
    const kand = [
      {form: "audit", kunde: "salon", gewicht: 1, schluessel: "g:audit:salon", gen: {form: "audit", opts: {}}},
      {form: "audit", kunde: "baeckerei", gewicht: 1, schluessel: "g:audit:baeckerei", gen: {form: "audit", opts: {}}},
    ];
    const offen = [{form: "audit", kunde: "salon"}];
    for (let s = 1; s <= 20; s++) {
      const w = Spiel.mischer.waehlen({kandidaten: kand, offen, verlauf: [], n: 2, z: Zufall(s)});
      erwarte.gleich(w.map(k => k.schluessel), ["g:audit:baeckerei"], `Seed ${s}: der offene Inhalt kam zurück`);
    }
    /* Ist NUR der offene Inhalt übrig, bleibt das Feld leer – lieber kein generiertes Angebot als
       dasselbe zweimal. Den Rest füllt die Geschichtsreihe (Spiel.postfachAuffuellen). */
    erwarte.gleich(Spiel.mischer.waehlen({kandidaten: [kand[0]], offen, verlauf: [], n: 1, z: Zufall(7)}), [],
      "kein doppelter Inhalt im Postfach");
    /* Story-Aufträge bleiben unberührt: sie sind über ihre ticketId ausgeschlossen, nicht über (Form, Kunde). */
    const story = [{form: "audit", kunde: "salon", gewicht: 3, schluessel: "t:salon-01", story: true, rang: 1}];
    erwarte.gleich(Spiel.mischer.waehlen({kandidaten: story, offen, verlauf: [], n: 1, z: Zufall(3)}).length, 1,
      "die Geschichte stockt trotz offenem Inhalt nicht");
  }));

  pruefe("Mischer: im echten Auffüllen liegt kein Inhalt doppelt im offenen Postfach", kapsel(() => {
    const FORMS = ["stoerung", "projekt", "terminal", "forensik", "audit", "beratung", "hotline"];
    const inhaltVon = i => { const d = Spiel.defVon(i); return i.gen ? "g:" + Spiel.formVon(d) + ":" + i.kunde : "t:" + i.ticketId; };
    let angebote = 0, runden = 0, doppelt = 0, serienMitDoppelt = 0;
    for (const stufe of [1, 2]) for (let h = 0; h < 6; h++) {
      const st = neu(stufe);
      st.erledigt.push({id: "start-a", sterne: 1, tag: "2026-01-01", hilfe: 0, quelle: "postfach", niveau: "E", zeitMs: 0, kunde: "salon", form: FORMS[h % 3]});
      st.erledigt.push({id: "start-b", sterne: 1, tag: "2026-01-02", hilfe: 0, quelle: "postfach", niveau: "E", zeitMs: 0, kunde: "baeckerei", form: FORMS[(h + 1) % 3]});
      const offen = () => st.postfach.filter(x => x.quelle === "postfach" || x.quelle === "generiert");
      let hier = 0;
      for (let r = 0; r < 15; r++) {
        const vorher = st.postfach.length;
        Spiel.postfachAuffuellen({still: true});
        angebote += st.postfach.length - vorher;
        runden++;
        const jetzt = new Set();
        for (const k of offen().map(inhaltVon)) { if (jetzt.has(k)) { doppelt++; hier++; } jetzt.add(k); }
        const o = offen();
        if (!o.length) break;
        /* Einen offenen Auftrag abschließen, damit nachgefüllt wird. */
        const weg = o[r % o.length], dWeg = Spiel.defVon(weg);
        st.postfach = st.postfach.filter(x => x !== weg);
        st.erledigt.push({id: weg.ticketId, sterne: 2, tag: "2026-02-01", hilfe: 0, quelle: weg.quelle, niveau: "E", zeitMs: 0, kunde: weg.kunde || null, form: Spiel.formVon(dWeg)});
      }
      if (hier) serienMitDoppelt++;
    }
    /* Der große Lauf (4 Stufen × 10 Verläufe × 30 Runden) steht im Kopf von src/spiel/mischer.js:
       vorher 21 von 1200 Auffüll-Runden mit doppeltem Inhalt, in 7 von 40 Serien – nachher 0. */
    erwarte.wahr(angebote > 100, `zu wenige Angebote für die Messung (${angebote})`);
    erwarte.gleich({doppelt, serienMitDoppelt}, {doppelt: 0, serienMitDoppelt: 0},
      `${angebote} Angebote in ${runden} Auffüll-Runden`);
  }));
});

/* ---------- GENERIERTE FRAGEN (task-18, eingehängt) ----------
   `Spiel.fragen` (src/spiel/fragen.js) erzeugt aus geprüften Vorlagen immer neue Aufgaben. Sie laufen
   NICHT in Spiel.mini.alle() mit (dort hängen die Zusicherungen über den festen Bestand), sondern
   werden über `fuerSkill` erreicht und über `von(id)` aus ihrer ID wieder aufgebaut.
   Gemessen (09.10.2026, echter Weg naechstes()+antworten()):
     20 Runden → 16 feste + 4 generierte Fragen aus 7 Fertigkeiten, 0 Wiederholungen (vor der
     Aufteilung waren es 9 feste + 11 generierte aus nur 3 Fertigkeiten: die generierte Frage gewann
     jede Runde, weil sie immer „noch nie gespielt“ ist).
     120 Runden → alle 65 festen Minis des E-Niveaus + 35 generierte, 27 Fertigkeiten, Abstand 93.
   Eine generierte Frage hat keinen Denkhilfen-Eintrag: `hilfe` fällt auf den Fertigkeitssatz zurück. */
gruppe("Mini: Generierte Fragen (task-18)", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe) Spiel.stufe.setzen("azubi", {still: true});
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && Spiel.stufe.setzen) Spiel.stufe.setzen("azubi", {still: true});
    }
  };
  const neu = (wahl = "auto") => {
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._lz = {}; Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD, {wahl});
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe) Spiel.stufe.setzen("azubi", {still: true});
    Spiel._einst.wahl = wahl;
    return Spiel._st;
  };
  /* Die feste Rotation einer Fertigkeit wirklich durchspielen (über den echten Antwortweg). */
  const erschoepfe = skill => {
    for (const m of Spiel.mini.alle().filter(x => x.skill === skill)) Spiel.mini.antworten(m.id, m.richtig);
  };
  const runden = n => {
    const folge = [];
    for (let i = 0; i < n; i++) {
      const m = Spiel.mini.naechstes();
      if (!m) break;
      folge.push(m);
      Spiel.mini.antworten(m.id, m.richtig);
    }
    return folge;
  };

  pruefe("Der feste Bestand bleibt die feste Liste: 92 Minis, keine generierte Frage darin", kapsel(() => {
    erwarte.wahr(!!(typeof Spiel.fragen !== "undefined" && Spiel.fragen && typeof Spiel.fragen.fuerSkill === "function"),
      "Spiel.fragen fehlt – der Generator ist nicht geladen");
    erwarte.gleich(Spiel.mini.alle().length, 92, "die feste Liste hat 92 Minis");
    erwarte.falsch(Spiel.mini.alle().some(m => String(m.id).startsWith("gf-")), "eine generierte Frage steht in alle()");
    erwarte.gleich(Spiel.mini.alle().filter(m => m.skill === "lab.ping").length, 6, "lab.ping bleibt bei sechs Minis");
    erwarte.falsch(!!(DATEN.miniDenkhilfen || {})["mini-link-2"], "mini-link-2 hat weiterhin keinen Denkhilfen-Eintrag");
    neu();
    erwarte.gleich(Spiel.mini.alle().length, 92, "auch nach einem frischen Stand: 92");
  }));

  pruefe("Erschöpfte Fertigkeit: die generierte Frage kommt, wird gefunden und beantwortet", kapsel(() => {
    neu();
    const skill = "lab.subnetz";
    erschoepfe(skill);
    const g = Spiel.mini.fuerSkill(skill);
    erwarte.wahr(!!g && g.generiert === true, `keine generierte Frage: ${g && g.id}`);
    erwarte.gleich(g.skill, skill, "die Frage gehört zur verlangten Fertigkeit");
    erwarte.wahr(String(g.id).startsWith("gf-") && g.skill && Array.isArray(g.optionen), "Form einer generierten Frage");
    erwarte.falsch(Spiel.mini.alle().some(x => x.id === g.id), "sie steht nicht im festen Bestand");
    erwarte.wahr(!!Spiel.mini.von(g.id), "von(id) findet sie");
    /* Neustart: der Zwischenspeicher des Generators ist leer – die ID trägt die Frage selbst. */
    const register = Spiel.fragen._register;
    Spiel.fragen._register = {};
    erwarte.wahr(!!Spiel.mini.von(g.id), "auch nach dem Neustart findet von(id) sie wieder");
    Spiel.fragen._register = register;
    /* Sprosse 1 ist der Fertigkeitssatz (kein Sonderweg), Sprosse 2 der Anfang der Frage. */
    Spiel.mini.setzen(g.id);
    const satz = String((Spiel.SENIOR_FRAGEN && Spiel.SENIOR_FRAGEN[skill]) || (Spiel.WERKZEUGE && Spiel.WERKZEUGE[skill]) || Spiel.MINI.DENKANSTOSS);
    const h1 = Spiel.mini.hilfe(g.id), h2 = Spiel.mini.hilfe(g.id);
    erwarte.gleich(h1 && h1.text, satz, "die Denkhilfe fällt auf den Fertigkeitssatz zurück");
    erwarte.gleich(h2 && h2.art, "ausschnitt", "die zweite Sprosse bleibt der Ausschnitt aus der Aufgabe");
    erwarte.falsch(String((h1 || {}).text + (h2 || {}).text).toLowerCase().includes(String(Spiel.mini.loesungText(g)).toLowerCase()),
      "keine Hilfe verrät die Lösung");
    const r = Spiel.mini.antworten(g.id, g.richtig);
    erwarte.wahr(!!r && r.richtig === true, "die generierte Frage lässt sich beantworten");
    erwarte.wahr(r.lohn > 0, "und zahlt den Lohn ihrer Stufe");
    /* Die nächste Frage dieser Fertigkeit ist eine andere: der Seed wächst mit dem Fortschritt. */
    const g2 = Spiel.mini.fuerSkill(skill);
    erwarte.wahr(!!g2 && g2.generiert === true && g2.id !== g.id, `dieselbe Frage noch einmal: ${g2 && g2.id}`);
  }));

  pruefe("Derselbe Spielstand ergibt dieselbe generierte Frage (kein Datum im Seed)", kapsel(() => {
    const skill = "lab.subnetz";
    neu(); erschoepfe(skill);
    const a = Spiel.mini.fuerSkill(skill);
    const stand = JSON.parse(JSON.stringify(Spiel.mini.stand()));
    neu(); Spiel._st.mini = JSON.parse(JSON.stringify(stand));
    const b = Spiel.mini.fuerSkill(skill);
    erwarte.wahr(!!a && !!b, "beide Male eine Frage");
    erwarte.gleich(b.id, a.id, "gleicher Stand, gleiche Frage");
  }));

  pruefe("Jede dritte Frage darf generiert sein – die feste Rotation bleibt wirksam", kapsel(() => {
    neu();
    const folge = runden(20);
    const gen = folge.filter(m => m.generiert).length;
    const fest = folge.length - gen;
    erwarte.gleich(folge.length, 20, "zwanzig Runden gespielt");
    erwarte.wahr(gen >= 1, "es kommt überhaupt eine generierte Frage");
    erwarte.wahr(gen <= 7, `zu viele generierte Fragen: ${gen} von 20 (Spiel.MINI.GENERIERT = ${Spiel.MINI.GENERIERT})`);
    erwarte.wahr(fest >= 13, `die feste Rotation kommt zu kurz: nur ${fest} feste Minis`);
    erwarte.gleich(new Set(folge.map(m => m.id)).size, 20, "keine Frage zweimal");
    const skills = new Set(folge.map(m => m.skill));
    erwarte.wahr(skills.size >= 6, `nur ${skills.size} Fertigkeiten in 20 Runden`);
  }));

  pruefe("120 Runden: der feste Vorrat kommt vollständig dran, dazu neue Fragen", kapsel(() => {
    neu();
    const folge = runden(120);
    const fest = new Set(folge.filter(m => !m.generiert).map(m => m.id));
    const moeglich = Spiel.mini.alle().filter(m => Spiel.mini.passtNiveau(m)).map(m => m.id);
    erwarte.gleich(folge.length, 120, "hundertzwanzig Runden gespielt");
    erwarte.gleich(moeglich.filter(id => !fest.has(id)), [], "diese festen Minis kamen nie dran");
    erwarte.wahr(folge.filter(m => m.generiert).length >= 20, "es kamen kaum neue Fragen");
    const drin = new Set(folge.map(m => m.skill));
    erwarte.gleich(Spiel.mini.alle().map(m => m.skill).filter(s => !drin.has(s)), [],
      "diese Fertigkeiten kamen in 120 Runden nie dran");
  }));

  pruefe("Befund: eine Fertigkeit mit nur AP2-Vorlagen liefert dem E-Spieler eine nicht passende Frage", kapsel(() => {
    /* Gemessen, nicht gewünscht: drei der acht Vorlagen-Fertigkeiten (lab.acl, lab.ttl, lab.vlan) haben
       nur AP2-Vorlagen. `passtNiveau` lehnt sie für E-Spieler ab; die Auswahl nimmt sie trotzdem,
       wenn nichts Passendes da ist – genau wie bei den festen Minis, wo „nichts Passendes“ nicht
       „nichts“ heißt (fuerSkill: `passt.length ? passt : kand`). */
    neu();
    erwarte.gleich(Spiel.karriere.niveau(), "E", "der Spieler steht auf E");
    erschoepfe("lab.vlan");
    const g = Spiel.mini.fuerSkill("lab.vlan");
    erwarte.wahr(!!g && g.generiert === true, "die generierte Frage kommt trotzdem");
    erwarte.gleich(g.stufe, "AP2", "sie ist eine AP2-Frage");
    erwarte.gleich(Spiel.mini.passtNiveau(g), false, "und passt damit nicht zum Niveau des Spielers");
  }));
});
