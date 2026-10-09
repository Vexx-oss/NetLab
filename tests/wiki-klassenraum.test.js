"use strict";
/* WIKI: DIE ZUSATZSEITEN (Leitung, 09.10.2026) — Klassenraum und Übergabe
   Datenpaket: src/daten/wiki.js → DATEN.wiki.klassenraum und DATEN.wiki.uebergabe · gelesen über die
   Wiki-Ansicht (src/ui/karriere.js `wikiAnsicht`), gesucht über `titel` und `kurz`.

   WARUM DIESE ZWEI SEITEN BESONDERE SIND: `DATEN.wiki` ist eine Seite je Fertigkeit – 27, die Tabelle
   ist gesperrt (Klassenraum-Codec, tools/klassenraum-probe/A-festlegung.md:128). Klassenraum und
   Übergabe sind keine Fertigkeiten, sondern Wege des Spiels; sie brauchen trotzdem ein Nachschlagewerk.
   Deshalb stehen sie als Zusatzseiten in derselben Form (gleiche Pflichtfelder, gleiche
   Abschnittsstruktur). Welche Seiten Zusatzseiten sind, steht in `DATEN.wikiZusatz` – EINE Quelle der
   Wahrheit, die auch die Ansicht liest.

   Geprüft wird je Seite: Pflichtfelder und Abschnitte, die Auffindbarkeit über die Suche, dass JEDER
   gedruckte Code wirklich vom Programm gelesen werden kann (kein erfundenes Beispiel), dass kein
   Konsolenrezept dasteht (und falls doch: die CLI kennt jede Zeile), und dass die Seite nichts
   behauptet, was der Code nicht hergibt. Beim Klassenraum wird das gegen den Codec geprüft, bei der
   Übergabe gegen `Spiel.uebergabe` selbst (Einstellungen, Lernstand, Spielstand, Rückgabefelder). */
gruppe("Wiki: Klassenraum", () => {
  const PFLICHT = ["titel", "kurz", "abschnitte", "merksatz", "pruefungstipp", "quelle", "belege", "siehe"];
  const seite = () => (DATEN.wiki || {}).klassenraum || null;
  const klein = x => String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim();
  /* Sichtbarer Text = alles, was UI.karriere.wikiAnsicht zeigt (ohne `belege`, `siehe`, `suche`). */
  const sichtbar = w => [w.titel, w.kurz, w.merksatz, w.pruefungstipp, w.quelle,
    ...(w.abschnitte || []).map(a => (a.titel || "") + " " + (a.html || ""))].filter(Boolean).join(" ");
  const alleHtml = w => (w.abschnitte || []).map(a => String(a.html || "")).join(" ");

  pruefe('Die Zusatzseite existiert, trägt die Pflichtfelder und gefüllte Abschnitte', () => {
    const w = seite();
    erwarte.wahr(!!w, "DATEN.wiki.klassenraum fehlt");
    if (!w) return;
    const fehler = [];
    for (const f of PFLICHT) {
      if (!Object.prototype.hasOwnProperty.call(w, f)) { fehler.push(`Feld ${f} fehlt`); continue; }
      const v = w[f];
      if (f === "abschnitte" || f === "siehe") { if (!Array.isArray(v) || !v.length) fehler.push(`${f} ist keine gefüllte Liste`); }
      else if (typeof v !== "string" || !v.trim()) fehler.push(`${f} ist leer`);
    }
    for (const [i, a] of (w.abschnitte || []).entries()) {
      if (!a || typeof a.titel !== "string" || a.titel.trim().length < 3) fehler.push(`Abschnitt ${i}: Titel fehlt`);
      if (!a || typeof a.html !== "string" || a.html.trim().length < 60) fehler.push(`Abschnitt ${i}: Text zu knapp`);
    }
    erwarte.gleich(fehler, []);
    erwarte.wahr((w.abschnitte || []).length >= 5, `Abschnitte: ${(w.abschnitte || []).length}`);
    for (const z of w.siehe || []) erwarte.wahr((DATEN.skills || []).some(s => s.id === z), `siehe-Ziel ${z} ist keine Fertigkeit`);
  });

  pruefe('Die Suche findet die Seite – genau über die Wörter der Ansicht', () => {
    const w = seite();
    if (!w) { erwarte.wahr(false, "ohne Seite nicht prüfbar"); return; }
    /* DIESELBE Rechnung wie src/ui/karriere.js: `titel + kurz` (+ Name der Seite), klein geschrieben. */
    const wieDieAnsicht = q => (String(w.titel) + " " + String(w.kurz)).toLowerCase().includes(q);
    for (const q of ["klassenraum", "code", "auftrag", "ergebnis"]) erwarte.wahr(wieDieAnsicht(q), `die Suche nach „${q}“ findet die Seite nicht`);
    /* `suche` trägt ZUSÄTZLICHE Wörter (Synonyme, Schreibweisen), die im Text nicht vorkommen müssen –
       dafür ist das Feld da. Geprüft wird, dass es sie wirklich gibt und dass sie sauber sind. */
    const liste = w.suche || [];
    erwarte.wahr(liste.length >= 5, `Suchwörter: ${liste.length}`);
    erwarte.gleich(liste.filter(x => typeof x !== "string" || !x.trim() || x.trim().length < 3), [], "leere oder zu kurze Suchwörter");
    erwarte.gleich([...new Set(liste.map(x => klein(x)))].length, liste.length, "Suchwörter doppelt");
    const nurInSuche = liste.filter(x => !wieDieAnsicht(klein(x)));
    erwarte.wahr(nurInSuche.length >= 2, `Suchwörter, die nur in der Liste stehen (der Zweck des Feldes): ${nurInSuche.length}`);
  });

  pruefe('Jeder auf der Seite gedruckte Code ist ein echter Code des Programms', () => {
    const w = seite();
    if (!w) { erwarte.wahr(false, "ohne Seite nicht prüfbar"); return; }
    const text = alleHtml(w);
    /* Platzhalter („NL-XXXX-XX“) sind Formmuster, keine Codes – sie werden nicht geprüft. */
    const echt = liste => [...new Set(liste || [])].filter(c => !c.includes("X"));
    const auftraege = echt(text.match(/NL-[A-Z0-9]{4}-[A-Z0-9]{2}/g));
    const ergebnisse = echt(text.match(/E-[A-Z0-9]{4}-[A-Z0-9]{3}/g));
    erwarte.wahr(auftraege.length >= 1, `echte Auftragscodes auf der Seite: ${auftraege.length}`);
    erwarte.wahr(ergebnisse.length >= 1, `echte Ergebnis-Codes auf der Seite: ${ergebnisse.length}`);
    for (const c of auftraege) {
      const r = Spiel.klassenraum.ausCode(c);
      erwarte.wahr(!!r && !r.fehler, `${c} ist kein gültiger Auftragscode: ${r && (r.grund || r.fehler)}`);
      if (r && !r.fehler) erwarte.wahr(typeof (r._def && r._def.id) === "string" && r._def.id.length > 0, `${c} liefert keine Auftrags-Kennung`);
    }
    for (const c of ergebnisse) {
      const r = Spiel.klassenraum.ergebnisLesen(c);
      erwarte.wahr(!!r && r.ok === true, `${c} ist kein gültiger Ergebnis-Code: ${r && (r.grund || r.fehler)}`);
    }
  });

  pruefe('Kein Konsolenrezept auf der Seite – und falls doch, läuft jede Zeile in der CLI', () => {
    const w = seite();
    if (!w) { erwarte.wahr(false, "ohne Seite nicht prüfbar"); return; }
    const text = alleHtml(w);
    const pre = text.match(/<pre>[\s\S]*?<\/pre>/g) || [];
    erwarte.gleich(pre.length, 0, "der Klassenraum spielt sich in der Oberfläche ab, nicht in der Konsole");
    /* Wächter für später: Sieht eine <code>-Stelle wie ein Konsolenbefehl aus, muss die CLI sie kennen. */
    const SYNTAX = /Invalid input|Incomplete command|Ambiguous command|Unrecognized command|command not found|falsch geschrieben|Folgender Befehl wurde nicht gefunden/i;
    const VERB = /^(show|ping|traceroute|tracert|ipconfig|netsh|arp|route|nslookup|dig|telnet|ss|systemctl|sudo|ip|switchport|interface|vlan|enable|configure|copy|write|erase|delete|reload|hostname|no)\b/i;
    const kandidaten = [...text.matchAll(/<code>([^<]+)<\/code>/g)].map(m => m[1].trim()).filter(t => VERB.test(t));
    const fehler = [];
    if (kandidaten.length) {
      const n = Modell.neu();
      Modell.geraet(n, "router", {id: "r1", name: "R1"});
      Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
      for (const befehl of kandidaten) {
        const host = /^(ipconfig|netsh|arp|nslookup|tracert)\b/i.test(befehl);
        const id = host ? "pc1" : "r1";
        const s = CLI.sitzung(n, id);
        if (!host) CLI.eingabe(s, "enable");
        const r = CLI.eingabe(s, befehl);
        if (SYNTAX.test(String((r && r.ausgabe) || ""))) fehler.push(`${befehl}: kennt die CLI nicht`);
      }
    }
    erwarte.gleich(fehler, []);
  });

  pruefe('Die Seite sagt, was NICHT passiert: keine Bewertung, kein Server, kein Beweis über den Abdruck', () => {
    const w = seite();
    if (!w) { erwarte.wahr(false, "ohne Seite nicht prüfbar"); return; }
    const sicht = klein(sichtbar(w));
    for (const wort of ["kein geheimnis", "kein server", "kein geld", "kein ruf", "keine note", "def.id", "median"])
      erwarte.wahr(sicht.includes(wort), `„${wort}“ fehlt auf der Seite`);
  });

  pruefe('Die Wiki-Ansicht listet 29 Einträge – beide Zusatzseiten dabei, ohne Stufenkopf' + wkZusatz(), () => {
    if (!wkHatRequire()) return;
    const st = wkPruefstand();
    const c = st.doc.createElement("div");
    st.UI.karriere.wikiAnsicht(c);
    const punkte = c.querySelectorAll(".kr-wiki-punkt");
    erwarte.gleich(punkte.length, 29, "Einträge der Liste (27 Fertigkeiten + 2 Zusatzseiten)");
    /* Die Listeneinträge hängen Titel und Stufe ohne Trenner aneinander („…prüfenStufe 1“); eine
       Zusatzseite hat keine Stufe und besteht deshalb genau aus ihrem Titel. */
    for (const titel of ["Klassenraum", "Übergabe"]) {
      const e = punkte.find(p => p.textContent === titel);
      erwarte.wahr(!!e, `„${titel}“ fehlt in der Liste`);
      if (e) erwarte.falsch(/Stufe/.test(e.textContent), `die Zusatzseite „${titel}“ trägt einen Stufenkopf`);
    }
    const fertigkeit = punkte.find(p => p.textContent.startsWith("Link und Kabel prüfen"));
    erwarte.wahr(!!fertigkeit && /Stufe 1/.test(fertigkeit.textContent), "eine Fertigkeitsseite trägt ihren Stufenkopf weiter");
  });

  pruefe('Die Suche der Ansicht findet die Zusatzseite – und der Klick öffnet sie' + wkZusatz(), () => {
    if (!wkHatRequire()) return;
    for (const wort of ["Klassenraum", "Code", "Ergebnis"]) {
      const st = wkPruefstand();
      const c = st.doc.createElement("div");
      st.UI.karriere.wikiAnsicht(c);
      const feld = c.querySelector("input[type=search]");
      erwarte.wahr(!!feld, "das Suchfeld steht in der Ansicht");
      if (!feld) continue;
      feld.value = wort;
      feld.oninput({target: feld});                       /* wie ein Mensch tippt */
      const treffer = c.querySelectorAll(".kr-wiki-punkt").filter(p => p.textContent.includes("Klassenraum"));
      erwarte.wahr(treffer.length === 1, `die Suche nach „${wort}“ findet den Klassenraum ${treffer.length}×`);
      treffer[0].onclick();                               /* wie ein Mensch klickt */
      const ueberschriften = c.querySelectorAll("h2").map(x => x.textContent);
      erwarte.wahr(ueberschriften.includes("Klassenraum"), `der Artikel zeigt nach dem Klick nicht den Klassenraum (${ueberschriften.join(", ")})`);
      const artikelText = c.querySelectorAll("article").map(a => a.textContent).join(" ");
      erwarte.falsch(/Stufe \d+ · AP/.test(artikelText), "der Artikel der Zusatzseite trägt keinen Stufenkopf");
    }
    /* Gegenprobe: eine Suche ohne Treffer filtert wirklich (die Liste ist dann leer). */
    const leer = wkPruefstand();
    const c2 = leer.doc.createElement("div");
    leer.UI.karriere.wikiAnsicht(c2);
    const f2 = c2.querySelector("input[type=search]");
    f2.value = "zzzzzz";
    f2.oninput({target: f2});
    erwarte.gleich(c2.querySelectorAll(".kr-wiki-punkt").length, 0, "eine Suche ohne Treffer zeigt keine Einträge");
  });
});

/* ===================================================================================================
   ÜBERGABE — zweite Zusatzseite (Leitung, 09.10.2026)
   Die Seite behauptet: Einstellungen bleiben, der Lernstand bleibt nur bei „Behalten", der Spielstand
   ist danach leer, ohne Lernmotor wird „Löschen" ehrlich abgelehnt. Jede dieser Behauptungen wird
   hier am ECHTEN `Spiel.uebergabe` nachgemessen (Kapsel: Speicher, Lernstand und Spielstand werden
   danach wiederhergestellt – dasselbe Muster wie tests/spiel-uebergabe.test.js). */
gruppe("Wiki: Übergabe", () => {
  const PFLICHT = ["titel", "kurz", "abschnitte", "merksatz", "pruefungstipp", "quelle", "belege", "siehe"];
  const seite = () => (DATEN.wiki || {}).uebergabe || null;
  const klein = x => String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim();
  const sichtbar = w => [w.titel, w.kurz, w.merksatz, w.pruefungstipp, w.quelle,
    ...(w.abschnitte || []).map(a => (a.titel || "") + " " + (a.html || ""))].filter(Boolean).join(" ");
  /* MESSEN AM ECHTEN CODE, obwohl eine fremde Datei eine Attrappe hinterlässt: tests/ui-uebergabe.test.js
     setzt `Spiel.uebergabe` (und `uebergabeLetzte`, `gutschreiben`) IM GETEILTEN Spiel-Objekt (Zeile
     112-114) und stellt es nicht zurück – alle später laufenden Testdateien sehen den Stub. Damit diese
     Prüfung trotzdem die WIRKLICHKEIT misst, wird `src/spiel/uebergabe.js` hier frisch geladen; danach
     kommt der vorgefundene Zustand zurück (die Fremddatei gehört mir nicht – Befund an die Leitung).
     Liefert die drei alten Werte zum Zurückstellen. */
  const wkEchtLaden = () => {
    if (!wkHatRequire()) return null;
    const fs = require("fs"), path = require("path");
    const quelle = fs.readFileSync(path.join(__dirname, "..", "src", "spiel", "uebergabe.js"), "utf8");
    const alt = {uebergabe: Spiel.uebergabe, letzte: Spiel.uebergabeLetzte, gutschreiben: Spiel.gutschreiben};
    /* `new Function` sieht die lexikalischen Deklarationen dieses Testskripts NICHT (`Spiel is not
       defined`, gemessen) – deshalb werden Spiel, L, jetzt und store als Parameter hineingereicht.
       So läuft die ECHTE Datei, nicht eine Attrappe. */
    new Function("Spiel", "L", "jetzt", "store", quelle)(Spiel, L, jetzt, store);
    return alt;
  };
  /* Kapsel liefert eine FUNKTION (prüfe erwartet eine) – Speicher, Lernstand und Spielstand werden
     danach wiederhergestellt, dasselbe Muster wie tests/spiel-uebergabe.test.js. */
  const wkKapsel = fn => () => {
    const altSpeicher = store.alles(), altLern = tief(L.st), altSt = Spiel._st, altEinst = Spiel._einst, uhr = jetzt();
    const altGen = Object.assign({}, Spiel.generierte);
    const altFn = wkEchtLaden();
    try { store.set("einst", {}); Spiel._einst = null; Spiel.neu(); fn(); }
    finally {
      if (altFn) { Spiel.uebergabe = altFn.uebergabe; Spiel.uebergabeLetzte = altFn.letzte; Spiel.gutschreiben = altFn.gutschreiben; }
      Spiel.generierte = altGen;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altSpeicher);
      const s = L.st; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, altLern);
      Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = {};
      jetzt.setzen(uhr); jetzt.frei();
    }
  };

  pruefe('Die Zusatzseite existiert, trägt die Pflichtfelder und gefüllte Abschnitte', () => {
    const w = seite();
    erwarte.wahr(!!w, "DATEN.wiki.uebergabe fehlt");
    if (!w) return;
    const fehler = [];
    for (const f of PFLICHT) {
      if (!Object.prototype.hasOwnProperty.call(w, f)) { fehler.push(`Feld ${f} fehlt`); continue; }
      const v = w[f];
      if (f === "abschnitte" || f === "siehe") { if (!Array.isArray(v) || !v.length) fehler.push(`${f} ist keine gefüllte Liste`); }
      else if (typeof v !== "string" || !v.trim()) fehler.push(`${f} ist leer`);
    }
    for (const [i, a] of (w.abschnitte || []).entries()) {
      if (!a || typeof a.titel !== "string" || a.titel.trim().length < 3) fehler.push(`Abschnitt ${i}: Titel fehlt`);
      if (!a || typeof a.html !== "string" || a.html.trim().length < 60) fehler.push(`Abschnitt ${i}: Text zu knapp`);
    }
    erwarte.gleich(fehler, []);
    erwarte.wahr((w.abschnitte || []).length >= 5, `Abschnitte: ${(w.abschnitte || []).length}`);
    for (const z of w.siehe || []) erwarte.wahr((DATEN.skills || []).some(s => s.id === z), `siehe-Ziel ${z} ist keine Fertigkeit`);
  });

  pruefe('Die Suche findet die Seite – über „Übergabe“, „Rechner“, „Lernstand“ und „Azubi“', () => {
    const w = seite();
    if (!w) { erwarte.wahr(false, "ohne Seite nicht prüfbar"); return; }
    const wieDieAnsicht = q => (String(w.titel) + " " + String(w.kurz)).toLowerCase().includes(q);
    for (const q of ["übergabe", "rechner", "lernstand", "azubi"]) erwarte.wahr(wieDieAnsicht(q), `die Suche nach „${q}“ findet die Seite nicht`);
    const liste = w.suche || [];
    erwarte.wahr(liste.length >= 5, `Suchwörter: ${liste.length}`);
    erwarte.gleich(liste.filter(x => typeof x !== "string" || !x.trim() || x.trim().length < 3), [], "leere oder zu kurze Suchwörter");
    erwarte.gleich([...new Set(liste.map(x => klein(x)))].length, liste.length, "Suchwörter doppelt");
    const nurInSuche = liste.filter(x => !wieDieAnsicht(klein(x)));
    erwarte.wahr(nurInSuche.length >= 2, `Suchwörter, die nur in der Liste stehen: ${nurInSuche.length}`);
  });

  pruefe('Behauptung „Behalten“: Einstellungen und Lernstand bleiben, der Spielstand ist leer', wkKapsel(() => {
    store.set("einst", {stufe: "geselle", klang: "leise"});
    Spiel.gutschreiben(120, 7, "Testauftrag");
    L.ueben("lab.ip", true);
    const kasten = L.box("lab.ip");
    erwarte.wahr(Spiel.st.euro > 0 && kasten > 0, "Ausgangslage: Geld und Lernstand sind da");
    const r = Spiel.uebergabe({lernstandBehalten: true});
    erwarte.wahr(r.ok, "Übergabe gelungen");
    erwarte.gleich(r.lernstandBehalten, true, "die Entscheidung kommt zurück");
    erwarte.gleich(Object.keys(r).sort(), ["lernstandBehalten", "nachher", "ok", "vorher"], "die Rückgabe trägt genau diese vier Felder");
    erwarte.gleich(store.get("einst", {}), {stufe: "geselle", klang: "leise"}, "die Einstellungen bleiben");
    erwarte.gleich(L.box("lab.ip"), kasten, "der Lernstand bleibt");
    erwarte.gleich(Spiel.st.euro, 0, "Geld weg");
    erwarte.gleich(Spiel.st.ruf, 0, "Ruf weg");
    erwarte.gleich(Spiel.st.erledigt, [], "erledigte Tickets weg");
    erwarte.gleich(Spiel.st.aktiv, null, "kein offener Auftrag mehr");
  }));

  pruefe('Behauptung „Löschen“: der Lernstand ist danach leer, die Einstellungen bleiben', wkKapsel(() => {
    store.set("einst", {stufe: "azubi"});
    L.ueben("lab.ip", true);
    erwarte.wahr(L.box("lab.ip") > 0, "vorher ist ein Kasten gehoben");
    const r = Spiel.uebergabe({lernstandBehalten: false});
    erwarte.wahr(r.ok, "Übergabe gelungen");
    erwarte.gleich(r.lernstandBehalten, false, "die Entscheidung kommt zurück");
    erwarte.gleich(L.box("lab.ip"), 0, "der Lernstand ist gelöscht");
    erwarte.gleich(store.get("einst", {}), {stufe: "azubi"}, "die Einstellungen bleiben");
    erwarte.gleich(Spiel.st.aktiv, null, "kein offener Auftrag mehr");
  }));

  pruefe('Behauptung „ohne Lernmotor wird Löschen ehrlich abgelehnt“: nichts wird angefasst', wkKapsel(() => {
    Spiel.st.euro = 42;
    Spiel.st.aktiv = "i3";
    const echt = L.reset;
    delete L.reset;
    try {
      const r = Spiel.uebergabe({lernstandBehalten: false});
      erwarte.wahr(!r.ok, "die Übergabe lehnt ab");
      erwarte.passt(r.grund, /Lernstand/, "der Grund nennt den Lernstand");
      erwarte.gleich(Spiel.st.euro, 42, "nichts angefasst: Geld");
      erwarte.gleich(Spiel.st.aktiv, "i3", "nichts angefasst: offener Auftrag");
    } finally { L.reset = echt; }
  }));

  pruefe('Behauptung „erst leeren, dann laden“: L.reset läuft VOR Spiel.neu', wkKapsel(() => {
    const reihe = [];
    const echtReset = L.reset, echtNeu = Spiel.neu;
    L.reset = () => { reihe.push("reset"); return echtReset.call(L); };
    Spiel.neu = () => { reihe.push("neu"); return echtNeu.call(Spiel); };
    try {
      Spiel.uebergabe({lernstandBehalten: false});
      erwarte.gleich(reihe[0], "reset", "der Lernstand wird zuerst geleert");
      erwarte.gleich(reihe[1], "neu", "danach entsteht der neue Spielstand");
      erwarte.gleich(reihe.filter(x => x === "reset").length, 1, "genau ein Leeren");
    } finally { L.reset = echtReset; Spiel.neu = echtNeu; }
  }));

  pruefe('Die Wiki-Ansicht zeigt die Übergabe – und die Suche führt hinein' + wkZusatz(), () => {
    if (!wkHatRequire()) return;
    const st = wkPruefstand();
    const c = st.doc.createElement("div");
    st.UI.karriere.wikiAnsicht(c);
    const eintrag = c.querySelectorAll(".kr-wiki-punkt").find(p => p.textContent === "Übergabe");
    erwarte.wahr(!!eintrag, "die Übergabe steht in der Liste");
    if (!eintrag) return;
    const feld = c.querySelector("input[type=search]");
    feld.value = "Übergabe";
    feld.oninput({target: feld});
    const treffer = c.querySelectorAll(".kr-wiki-punkt").filter(p => p.textContent.includes("Übergabe"));
    erwarte.gleich(treffer.length, 1, "genau ein Treffer für „Übergabe“");
    treffer[0].onclick();
    erwarte.wahr(c.querySelectorAll("h2").map(x => x.textContent).includes("Übergabe"), "der Artikel zeigt die Übergabe");
  });
});

/* ---------- kleiner DOM-Prüfstand für die Wiki-Ansicht (Muster: tests/spiel-mini-hilfe.test.js,
   tests/hilfe-ebene2.test.js). Auf Dateiebene, weil zwei Gruppen ihn brauchen. Ohne `require`
   (reine Browserseite) ist der Fall nicht prüfbar – dann heißt der Test „nicht prüfbar“. ---------- */
function wkHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
function wkZusatz(){ return wkHatRequire() ? "" : " (nicht prüfbar: ohne require/DOM)"; }
function wkKlassen(el){ return String((el && el.className) || "").split(/\s+/).filter(Boolean); }
function wkPasst(el, sel){
  if (sel.startsWith(".")) return wkKlassen(el).includes(sel.slice(1));
  if (/^input\[type=search\]$/.test(sel)) return el.tag === "input" && el.attrs.type === "search";
  return el.tag === sel;
}
function wkSammle(el, sel, liste){
  for (const k of el.kinder || []) {
    if (!k || k.nodeType !== 1) continue;
    if (wkPasst(k, sel)) liste.push(k);
    wkSammle(k, sel, liste);
  }
  return liste;
}
function wkText(k){ return k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? String(k.text) : String(k.textContent || "")); }
function wkKnoten(tag){
  const el = {tag, nodeType: 1, kinder: [], attrs: {}, className: "", value: "", _text: ""};
  el.classList = {add(){}, remove(){}, toggle(){}, contains: c => wkKlassen(el).includes(c)};
  el.append = (...k) => {
    for (const x of k.flat(Infinity)) {
      if (x == null || x === false) continue;
      el.kinder.push((typeof x === "object" && x.nodeType) ? x : {nodeType: 3, text: String(x)});
    }
  };
  el.replaceChildren = (...k) => { el.kinder = []; el.append(...k); };
  el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
  el.getAttribute = k => (k in el.attrs ? el.attrs[k] : null);
  el.addEventListener = () => {};
  el.focus = () => {};
  el.setSelectionRange = () => {};
  el.querySelector = sel => wkSammle(el, sel, [])[0] || null;
  el.querySelectorAll = sel => wkSammle(el, sel, []);
  Object.defineProperty(el, "textContent", {configurable: true,
    get: () => el.kinder.length ? el.kinder.map(wkText).join("") : el._text, set: v => { el._text = String(v); el.kinder = []; }});
  return el;
}
function wkH(tag, attrs = {}, ...kinder){
  const el = wkKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = String(v);
    else if (k === "html") el.html = String(v);
    else if (k === "style" && typeof v === "object") { /* für den Test bedeutungslos */ }
    else if (k.startsWith("on") && typeof v === "function") el[k] = v;      /* onclick/oninput als Eigenschaft */
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kinder);
  return el;
}
function wkPruefstand(){
  const vm = require("vm"), fs = require("fs"), path = require("path");
  const doc = wkKnoten("body");
  doc.body = doc; doc.createElement = t => wkKnoten(t); doc.createTextNode = t => ({nodeType: 3, text: String(t)});
  doc.addEventListener = () => {}; doc.removeEventListener = () => {};
  const UI = {app: {registrieren(){}, einstellungAbschnitt(){}, ansicht(){}, dialogOeffnen(){}, dialogZu(){}},
    toast(){}, symbol: () => wkKnoten("span"), spiel: {}, leiste: {miniBereich: null, status(){}, aufbauen(){}},
    klang: {spielen(){}}, buehneFrei: () => true, modus(){}, netzplan: {}};
  const Bus = {an: () => () => {}, aus(){}, senden(){}};
  const bereich = {UI, Bus, Spiel, DATEN, store, document: doc, h: wkH, sv: wkH,
    Plattform: {name: "browser", kann: () => ({ja: false, grund: "Test"}), fenster: {groesse: () => Promise.resolve()}},
    klemme: (x, a, b) => Math.min(b, Math.max(a, x)), zahlDe: x => String(x), jetzt,
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    requestAnimationFrame: fn => { fn(); return 0; },
    console: {log(){}, warn(){}, error(){}}, LABOR_VERSION: "test"};
  vm.createContext(bereich);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "karriere.js"), "utf8"), bereich, {filename: "ui/karriere.js"});
  return {UI: bereich.UI, doc};
}
