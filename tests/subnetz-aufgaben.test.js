"use strict";
/* ---------- Tests: Subnetting-Aufgabenmotor (src/spiel/subnetz.js, Entwurf Runde 7 §§ 2.1, 5, 6) ----------
   Deckt den GENERATOR ab, nicht nur die Mathematik:
     · jede art×Stufe aus § 6 liefert eine vollständige Aufgabe in der Form aus § 2.1
     · Stufenmatrix § 5: Präfix-Zahlenraum, Schrittzahl des Rechenwegs, Hinweis-Regel (E immer, AP2 nie)
     · genau eine richtige Antwort, Distraktoren eindeutig und (bei Auswahl) bedienbar
     · Determinismus: derselbe Seed ergibt byte-gleich dieselbe Aufgabe und denselben Satz
     · satz() ohne Doppelte, arten-Filter wirkt
     · antwort() verbucht über L.ueben/L.fehler und den eigenen Store; trocken schreibt nichts
     · Rechenweg endet in der Lösung; keine 32-Bit-Dezimalzahlen im Lernweg (Leitungsbefund)
   Kapsel wie in tests/subnetz-kern.test.js: jeder Schreib-Test stellt Store und Lernstand zurück. */
gruppe("Subnetz: Aufgabenmotor", () => {
  const S = Spiel.subnetz;
  const STUFEN = ["E", "AP1", "AP2"];
  const PRAEFIX_ARTEN = ["netzid", "broadcast", "hosts", "maske", "block", "subnetze", "vlsm", "zusammenfassen"];
  const BEREICH = {E: [24, 28], AP1: [20, 30], AP2: [16, 31]};
  /* § 5 nennt die Zahl der LÖSUNGSSCHRITTE (E 1, AP1 2–3, AP2 3–5). § 2.1 verlangt für den
     ANGEZEIGTEN Rechenweg 3–6 Schritte. Beides wird getrennt geprüft: `loesungsschritte` gegen die
     Matrix, `rechenweg.length` gegen 3–6 — der Rechenweg erklärt mehr, als zur Lösung nötig ist. */
  const LOESUNGSSCHRITTE = {E: [1, 1], AP1: [2, 3], AP2: [3, 5]};

  function kapsel(fn){
    return () => {
      const altSpeicher = store.alles(), altLern = tief(L.st);
      const altSt = Spiel._st, altEinst = Spiel._einst, altLz = Spiel._lz, altTrocken = Spiel._trocken;
      try { fn(); }
      finally {
        for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
        Object.assign(SPEICHER.daten, altSpeicher);
        const s = L.st;
        for (const k of Object.keys(s)) delete s[k];
        Object.assign(s, altLern);
        Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = altLz; Spiel._trocken = altTrocken;
      }
    };
  }

  const paare = () => { const l = []; for (const a of S.ARTEN) for (const st of a.stufen) l.push({art: a.id, stufe: st}); return l; };
  const auf = (art, stufe, seed) => S.aufgabe({art, niveau: stufe, seed});
  const json = x => JSON.stringify(x);

  /* Präfixe einer Aufgabe: /p-Angaben und Dotted-Masken (in Präfix umgerechnet). */
  function praefixeAus(text){
    const aus = [];
    const reP = /\/(\d{1,2})\b/g;
    let m;
    while ((m = reP.exec(text))) aus.push(Number(m[1]));
    const reM = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
    while ((m = reM.exec(text))){
      const p = S.maskeZuPraefix(m[0]);
      if (p != null) aus.push(p);
    }
    return aus;
  }

  /* ================= 1. Form und Vollständigkeit jeder Aufgabe (§ 2.1) ================= */
  pruefe("aufgabe(): jede art×Stufe liefert eine vollständige Aufgabe in der Form aus § 2.1", () => {
    const fehler = [];
    for (const {art, stufe} of paare()){
      const info = S.ARTEN.find(a => a.id === art);
      for (let seed = 1; seed <= 5; seed++){
        const wo = `${art}/${stufe}/Seed ${seed}: `;
        const a = auf(art, stufe, seed);
        if (!a){ fehler.push(wo + "keine Aufgabe"); continue; }
        if (a.art !== art) fehler.push(wo + "art " + a.art);
        if (a.niveau !== stufe) fehler.push(wo + "niveau " + a.niveau);
        if (a.skill !== info.skills[0]) fehler.push(wo + "skill " + a.skill);
        if (!new RegExp("^" + art + "-" + stufe + "-\\d{4}$").test(String(a.id))) fehler.push(wo + "id " + a.id);
        if (!a.titel || typeof a.titel !== "string") fehler.push(wo + "titel fehlt");
        if (!a.frage || typeof a.frage !== "string") fehler.push(wo + "frage fehlt");
        else {
          if (a.frage.length > 220) fehler.push(wo + "frage " + a.frage.length + " Zeichen (§ 5: bis 220)");
          if (a.frage.length < 8) fehler.push(wo + "frage zu kurz");
          if (stufe === "E" && /(^|\s)(nicht|kein|keine|keinen|keinem|keiner)\s/i.test(a.frage)) fehler.push(wo + "negative Fangfrage auf E");
        }
        if (!Array.isArray(a.lage) || a.lage.length < 1 || a.lage.length > 4) fehler.push(wo + "lage hat " + (a.lage || []).length + " Zeilen (1–4)");
        else for (const z of a.lage){
          if (!z || typeof z.label !== "string" || !z.label) fehler.push(wo + "lage.label fehlt");
          if (!z || typeof z.wert !== "string" || !z.wert) fehler.push(wo + "lage.wert fehlt");
        }
        const e = a.eingabe;
        if (!e || typeof e !== "object") fehler.push(wo + "eingabe fehlt");
        else {
          if (!["ip", "zahl", "maske", "auswahl"].includes(e.art)) fehler.push(wo + "eingabe.art " + e.art);
          if (e.art === "auswahl"){
            if (!Array.isArray(e.optionen) || e.optionen.length < 3 || e.optionen.length > 4) fehler.push(wo + "auswahl braucht 3–4 Optionen");
            else {
              const texte = e.optionen.map(o => o && o.text);
              if (texte.some(t => typeof t !== "string" || !t)) fehler.push(wo + "Option ohne Text");
              if (new Set(texte).size !== texte.length) fehler.push(wo + "doppelte Option");
              const treffer = texte.filter(t => t === a.loesung.wert).length;
              if (treffer !== 1) fehler.push(wo + treffer + " richtige Optionen (genau eine erwartet)");
            }
          } else if (e.optionen !== undefined) fehler.push(wo + "Optionen ohne Auswahl-Eingabe");
        }
        if (!a.loesung || typeof a.loesung.wert !== "string" || !a.loesung.wert) fehler.push(wo + "loesung.wert fehlt");
        if (!a.loesung || typeof a.loesung.text !== "string" || !a.loesung.text) fehler.push(wo + "loesung.text fehlt");
        const rw = a.rechenweg;
        if (!Array.isArray(rw) || rw.length < 3 || rw.length > 6) fehler.push(wo + "rechenweg hat " + (rw || []).length + " Schritte (3–6)");
        else {
          if (typeof a.loesungsschritte !== "number" || !Number.isInteger(a.loesungsschritte)) fehler.push(wo + "loesungsschritte fehlt");
          else {
            const [lo, hi] = LOESUNGSSCHRITTE[stufe];
            if (a.loesungsschritte < lo || a.loesungsschritte > hi) fehler.push(wo + `loesungsschritte ${a.loesungsschritte} außerhalb ${lo}–${hi} (§ 5)`);
          }
          rw.forEach((s, i) => {
            if (s.n !== i + 1) fehler.push(wo + "Schritt " + (i + 1) + " hat n=" + s.n);
            if (typeof s.titel !== "string" || !s.titel) fehler.push(wo + "Schritt " + (i + 1) + " ohne Titel");
            if (typeof s.text !== "string" || s.text.length < 8) fehler.push(wo + "Schritt " + (i + 1) + " ohne Text");
            if (typeof s.ergebnis !== "string" || !s.ergebnis) fehler.push(wo + "Schritt " + (i + 1) + " ohne Ergebnis");
          });
          if (rw[rw.length - 1].ergebnis !== a.loesung.text) fehler.push(wo + "rechenweg endet nicht in der Lösung");
        }
        if (typeof a.erklaerung !== "string" || a.erklaerung.length < 25) fehler.push(wo + "erklaerung fehlt oder zu knapp");
        if (!/\b(du|Du|dich|dir|dein|deine)\b/.test(String(a.erklaerung || ""))) fehler.push(wo + "erklaerung spricht nicht in Du-Form");
        if (stufe === "E" && !a.hinweis) fehler.push(wo + "E-Aufgabe ohne hinweis");
        if (stufe === "AP2" && a.hinweis !== "") fehler.push(wo + "AP2-Aufgabe mit hinweis (§ 5: kein hinweis)");
        if (a.hinweis != null && typeof a.hinweis !== "string") fehler.push(wo + "hinweis kein Text");
        if (a.visual !== null){
          if (!a.visual || !["bitlabor", "maskenleiste", "blocklineal", "rechner", "vlsm", "vlan"].includes(a.visual.art)) fehler.push(wo + "visual.art ist kein Werkzeug von W4");
          if (!a.visual || !a.visual.preset || typeof a.visual.preset !== "object") fehler.push(wo + "visual.preset fehlt");
        }
        if (typeof a.quelle !== "string" || !/(RFC|IEEE)/.test(a.quelle)) fehler.push(wo + "quelle fehlt");
        const texte = [a.titel, a.frage, a.erklaerung, a.hinweis].concat(rw.map(s => s.text)).concat(a.lage.map(z => z.wert)).join(" ");
        if (/\d{8,}/.test(texte)) fehler.push(wo + "Zahl mit 8+ Stellen im Aufgabentext (Leitungsbefund: oktettweise rechnen)");
        if (/Netzbita/.test(texte)) fehler.push(wo + "Tippfehler Netzbita");
        if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(texte)) fehler.push(wo + "Emoji im Aufgabentext (§ 3)");
      }
    }
    erwarte.gleich(fehler.slice(0, 10), [], `Formfehler in den Aufgaben (${fehler.length} gefunden)`);
  });

  /* ================= 2. Lage trägt alle Angaben der Frage ================= */
  pruefe("aufgabe(): jede Adresse und jeder Präfix der Frage steht in der lage (alle Angaben beisammen)", () => {
    const fehler = [];
    for (const {art, stufe} of paare()){
      for (let seed = 1; seed <= 5; seed++){
        const a = auf(art, stufe, seed);
        if (!a) continue;
        const lageText = a.lage.map(z => z.label + " " + z.wert).join(" ");
        /* Portnamen wie Fa0/9 sind Zielangaben, keine Präfixe — vor der Präfixsuche entfernen. */
        const frageText = a.frage.replace(/\b(?:Fa|Gi|G|Eth|Te|Po)\d+\/\d+(?:\/\d+)?/g, "");
        const re = /\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\b/g;
        let m;
        while ((m = re.exec(frageText))) if (!lageText.includes(m[0])) fehler.push(`${art}/${stufe}/${seed}: ${m[0]} fehlt in der lage`);
        const reP = /\/(\d{1,2})\b/g;
        while ((m = reP.exec(frageText))) if (!lageText.includes("/" + m[1])) fehler.push(`${art}/${stufe}/${seed}: /${m[1]} fehlt in der lage`);
      }
    }
    erwarte.gleich(fehler.slice(0, 10), [], `Angaben fehlen in der lage (${fehler.length} gefunden)`);
  });

  /* ================= 3. Stufenmatrix § 5: Zahlenraum, Schrittzahl, Hilfen ================= */
  pruefe("Stufenmatrix § 5: Präfix-Zahlenraum, Schrittzahl und Hinweis-Regel je Stufe", () => {
    const fehler = [];
    for (const {art, stufe} of paare()){
      const [min, max] = BEREICH[stufe];
      for (let seed = 1; seed <= 8; seed++){
        const a = auf(art, stufe, seed);
        if (!a){ fehler.push(`${art}/${stufe}/${seed}: keine Aufgabe`); continue; }
        const texte = a.frage + " " + a.lage.map(z => z.wert).join(" ") + " " + a.rechenweg.map(s => s.text).join(" ");
        if (PRAEFIX_ARTEN.includes(art)){
          const ps = praefixeAus(texte);
          if (!ps.length) fehler.push(`${art}/${stufe}/${seed}: kein Präfix gefunden`);
          for (const p of ps) if (p < min || p > max) fehler.push(`${art}/${stufe}/${seed}: Präfix /${p} außerhalb /${min}–/${max}`);
        }
        if (stufe === "E"){
          if (!a.hinweis) fehler.push(`${art}/E/${seed}: hinweis fehlt (§ 5: E immer)`);
          if (art === "block" && praefixeAus(texte).some(p => Math.pow(2, 32 - p) > 128)) fehler.push(`${art}/E/${seed}: Blockgröße > 128`);
        }
        if (stufe === "AP2" && a.hinweis !== "") fehler.push(`${art}/AP2/${seed}: hinweis gesetzt (§ 5: AP2 keiner)`);
        const [loL, hiL] = LOESUNGSSCHRITTE[stufe];
        if (a.loesungsschritte < loL || a.loesungsschritte > hiL) fehler.push(`${art}/${stufe}/${seed}: ${a.loesungsschritte} Lösungsschritte (${loL}–${hiL} nach § 5)`);
      }
    }
    erwarte.gleich(fehler.slice(0, 10), [], `Stufenmatrix-Verstöße (${fehler.length} gefunden)`);
    /* Zusatzprobe: AP2 deckt wirklich beide Oktett-Lagen ab (drittes und viertes Oktett). */
    const oktette = new Set();
    for (const art of ["netzid", "broadcast", "block"]){
      for (let seed = 1; seed <= 20; seed++){
        const a = auf(art, "AP2", seed);
        if (!a) continue;
        const m = /(ersten|zweiten|dritten|vierten) Oktett/.exec(JSON.stringify(a));
        if (m) oktette.add(m[1]);
      }
    }
    erwarte.wahr(oktette.size >= 2, "AP2 kommt in mehr als einer Oktett-Lage vor: " + [...oktette].join(", "));
  });

  /* ================= 4. Genau eine richtige Antwort ================= */
  pruefe("aufgabe(): genau eine richtige Antwort, Distraktoren und Alternativformate werden richtig bewertet", () => {
    const fehler = [];
    for (const {art, stufe} of paare()){
      for (let seed = 1; seed <= 4; seed++){
        const a = auf(art, stufe, seed);
        if (!a) continue;
        const wo = `${art}/${stufe}/${seed}: `;
        const richtig = S.pruefen(a, a.loesung.wert);
        if (!richtig.richtig) fehler.push(wo + "kanonische Lösung wird nicht als richtig erkannt");
        if (richtig.soll !== a.loesung.text) fehler.push(wo + "soll zeigt nicht den Lösungstext");
        if (a.eingabe.art === "auswahl"){
          const texte = a.eingabe.optionen.map(o => o.text);
          const index = texte.indexOf(a.loesung.wert);
          if (index < 0) fehler.push(wo + "Lösung steht in keiner Option");
          for (let i = 0; i < texte.length; i++){
            const r = S.pruefen(a, i);
            if (r.richtig !== (i === index)) fehler.push(wo + "Options-Index " + i + " wird falsch bewertet");
          }
          for (const t of texte) if (t !== a.loesung.wert && S.pruefen(a, t).richtig) fehler.push(wo + "falsche Option wird als richtig bewertet");
          if (S.pruefen(a, "Z").richtig) fehler.push(wo + "unbekannte Option wird als richtig bewertet");
        } else if (a.eingabe.art === "ip"){
          const t = a.loesung.wert.split(".");
          t[0] = String((Number(t[0]) + 1) % 256);
          const falsch = t.join(".");
          if (falsch !== a.loesung.wert && S.pruefen(a, falsch).richtig) fehler.push(wo + "falsche IP wird als richtig bewertet");
          if (!S.pruefen(a, "  " + a.loesung.wert + "  ").richtig) fehler.push(wo + "Leerzeichen um die IP werden nicht toleriert");
        } else if (a.eingabe.art === "zahl"){
          const falsch = String(Number(a.loesung.wert) + 1);
          if (S.pruefen(a, falsch).richtig) fehler.push(wo + "falsche Zahl wird als richtig bewertet");
          if (!S.pruefen(a, "  " + a.loesung.wert + " ").richtig) fehler.push(wo + "Leerzeichen um die Zahl werden nicht toleriert");
        } else if (a.eingabe.art === "maske"){
          const p = S.maskeZuPraefix(a.loesung.wert);
          if (p == null) fehler.push(wo + "Lösung ist weder Präfix noch Maske");
          else {
            const andere = (p + 7) % 33;
            if (S.pruefen(a, S.praefixZuMaske(andere)).richtig) fehler.push(wo + "falsche Maske wird als richtig bewertet");
            if (S.pruefen(a, "/" + andere).richtig) fehler.push(wo + "falscher Präfix wird als richtig bewertet");
            /* Formattoleranz: beide Schreibweisen müssen dasselbe bedeuten. */
            const alsPraefix = "/" + p, alsDotted = S.praefixZuMaske(p);
            if (!S.pruefen(a, alsPraefix).richtig) fehler.push(wo + "Präfix-Schreibweise wird nicht akzeptiert");
            if (!S.pruefen(a, alsDotted).richtig) fehler.push(wo + "Dotted-Schreibweise wird nicht akzeptiert");
          }
        }
      }
    }
    erwarte.gleich(fehler.slice(0, 10), [], `Bewertungsfehler (${fehler.length} gefunden)`);
  });

  /* ================= 5. Determinismus ================= */
  pruefe("Determinismus: derselbe Seed ergibt byte-gleich dieselbe Aufgabe, der Satz ist reproduzierbar", () => {
    for (const {art, stufe} of paare()){
      for (const seed of [1, 7, 42, 123456]){
        erwarte.gleich(json(auf(art, stufe, seed)), json(auf(art, stufe, seed)), `${art}/${stufe}/Seed ${seed} zweimal gleich`);
      }
    }
    for (const stufe of STUFEN){
      const a = S.satz({niveau: stufe, anzahl: 7, seed: 99});
      const b = S.satz({niveau: stufe, anzahl: 7, seed: 99});
      erwarte.gleich(json(a), json(b), `satz ${stufe}: zweimal derselbe Seed ergibt denselben Satz`);
    }
    erwarte.gleich(json(auf("netzid", "E")), json(auf("netzid", "E", 1)), "ohne seed gilt der feste Seed 1");
  });

  /* ================= 6. Variantenvielfalt je art×Stufe ================= */
  pruefe("Varianten: jede art×Stufe liefert mindestens 3 unterscheidbare Aufgaben (§ 6)", () => {
    const fehler = [];
    for (const {art, stufe} of paare()){
      const varianten = new Set();
      for (let seed = 1; seed <= 20; seed++){
        const a = auf(art, stufe, seed);
        if (a) varianten.add(json([a.lage, a.loesung, a.rechenweg]));
      }
      if (varianten.size < 3) fehler.push(`${art}/${stufe}: nur ${varianten.size} Varianten`);
    }
    erwarte.gleich(fehler, [], "jede art×Stufe hat mindestens 3 Varianten");
  });

  /* ================= 7. satz(): gemischt, ohne Doppelte, Filter ================= */
  pruefe("satz(): gemischt ohne Doppelte, nur erlaubte Stufen, arten-Filter und Grenzfälle", () => {
    for (const stufe of STUFEN){
      const erlaubt = S.ARTEN.filter(a => a.stufen.includes(stufe)).map(a => a.id);
      const s = S.satz({niveau: stufe, anzahl: erlaubt.length, seed: 7});
      erwarte.gleich(s.length, erlaubt.length, `satz ${stufe}: Länge bei anzahl = Anzahl der Typen`);
      erwarte.gleich(s.map(a => a.niveau).filter(n => n !== stufe), [], `satz ${stufe}: alle Aufgaben tragen die Stufe`);
      erwarte.gleich(s.every(a => erlaubt.includes(a.art)), true, `satz ${stufe}: nur Typen der Stufe`);
      erwarte.gleich(new Set(s.map(a => a.id)).size, s.length, `satz ${stufe}: Ids ohne Doppelte`);
      erwarte.gleich(new Set(s.map(a => json(a))).size, s.length, `satz ${stufe}: Aufgaben ohne Doppelte`);
      const nurBloecke = S.satz({niveau: stufe, anzahl: 4, seed: 5, arten: ["block", "vlsm"]});
      erwarte.gleich(nurBloecke.every(a => ["block", "vlsm"].includes(a.art)), true, `satz ${stufe}: arten-Filter wirkt`);
      if (stufe === "E"){
        const viele = S.satz({niveau: "E", anzahl: 10, seed: 3});
        erwarte.gleich(viele.length, 10, "satz E: zehn Aufgaben, obwohl nur sechs Typen zur Verfügung stehen");
        erwarte.gleich(new Set(viele.map(a => json(a))).size, 10, "satz E: auch bei zehn Aufgaben keine Doppelten");
      }
    }
    erwarte.gleich(S.satz({niveau: "E", anzahl: 0, seed: 1}), [], "anzahl 0 ergibt leeren Satz");
    erwarte.gleich(S.satz({niveau: "E", arten: ["trunk"], seed: 1}), [], "kein Typ der Stufe → leerer Satz");
    erwarte.gleich(S.satz({niveau: "AP2", arten: ["gibtsnicht"], seed: 1}), [], "unbekannter Typ → leerer Satz");
  });

  /* ================= 8. pruefen wirft nie ================= */
  pruefe("pruefen(): kein Wurf bei Unfug, immer die sechs Felder — für jede art×Stufe", () => {
    const aufgaben = [];
    for (const {art, stufe} of paare()) aufgaben.push(auf(art, stufe, 2));
    for (const a of aufgaben){
      if (!a) continue;
      for (const ant of [null, undefined, "", 0, 42, {}, [], "irgendwas", "999.999.999.999", "/40", "2^2"]){
        let r;
        try { r = S.pruefen(a, ant); }
        catch (e){ throw new Error("pruefen warf bei " + a.art + " / " + json(ant) + ": " + e.message); }
        erwarte.gleich(typeof r.richtig, "boolean", a.art + ": richtig ist bool");
        for (const f of ["soll", "angenommen", "erklaerung", "hinweis"]) erwarte.gleich(typeof r[f], "string", a.art + ": " + f + " ist Text");
        erwarte.wahr(Array.isArray(r.rechenweg), a.art + ": rechenweg ist Liste");
      }
    }
  });

  /* ================= 9. antwort(): Verbuchung, trocken, Spiel-Bestwert ================= */
  pruefe("antwort(): jede art×Stufe wird über L.ueben verbucht; Module steigen; trocken schreibt nichts", kapsel(() => {
    store.set("subnetz", null);
    const lernVorher = json(L.st);
    Spiel._trocken = true;
    for (const {art, stufe} of paare()){
      const a = auf(art, stufe, 11);
      const r = S.antwort(a, true, {});
      erwarte.gleich(r.lern, null, `${art}/${stufe}: trocken keine Lernverbuchung`);
    }
    erwarte.gleich(json(store.get("subnetz", null)), "null", "trocken bleibt der eigene Store leer");
    erwarte.gleich(json(L.st), lernVorher, "trocken bleibt der Lernmotor unberührt");
    Spiel._trocken = false;
    for (const {art, stufe} of paare()){
      const a = auf(art, stufe, 12);
      const r = S.antwort(a, true, {});
      erwarte.wahr(!!r.lern && typeof r.lern.vorher === "number" && typeof r.lern.nachher === "number", `${art}/${stufe}: L.ueben liefert vorher/nachher`);
    }
    const f = S.fortschritt();
    erwarte.gleich(f.gesamt.richtig, paare().length, "jede Antwort zählt im Gesamtzähler");
    erwarte.gleich(f.gesamt.falsch, 0, "keine falsche Antwort verbucht");
    erwarte.gleich(Object.keys(f.module).filter(id => f.module[id].status !== "neu").length, 8, "alle 8 Module sind nach den Antworten mindestens geuebt");
    for (const id of Object.keys(f.module)) erwarte.wahr(["gelesen", "geuebt", "sicher"].includes(f.module[id].status), "Modul " + id + " hat einen gültigen Status");
    /* Spiel-Bestwert über die additive Option (W4-Absprache). */
    const a = auf("maske", "E", 13);
    S.antwort(a, true, {spiel: {id: "praefix-blitz", punkte: 9}});
    S.antwort(a, true, {spiel: {id: "praefix-blitz", punkte: 4}});
    erwarte.gleich(S.fortschritt().spiele["praefix-blitz"], {bestwert: 9, runden: 2}, "Bestwert ist das Maximum, runden zählt die Runden");
    /* Falsche Antwort zählt falsch und senkt sicher auf geuebt. */
    S.modulSetzen("netzid", "sicher");
    const r = S.antwort(auf("netzid", "E", 14), false, {});
    erwarte.gleich(r.fortschritt.module.netzid.status, "geuebt", "Fehler senkt sicher auf geuebt");
    erwarte.gleich(r.fortschritt.gesamt.falsch, 1, "Fehler zählt im Gesamtzähler");
    /* Unbekannte Aufgabe wird nicht verbucht. */
    const leer = S.antwort(null, true, {});
    erwarte.gleich(leer.lern, null, "ohne Aufgabe keine Verbuchung");
  }));

  /* ================= 10. Stufen-Spezifika aus § 5 (VLSM, VLAN, Schritte) ================= */
  pruefe("Stufen-Spezifika § 5: VLSM-Netzzahl, VLAN-Komplexität, E ohne Hilfsrechnung im Rechenweg", () => {
    const fehler = [];
    /* VLSM: AP1 2–3 Netze, AP2 4–5 Netze (aus der lage ablesbar). */
    for (let seed = 1; seed <= 10; seed++){
      const a = auf("vlsm", "AP1", seed);
      if (a){
        const n = (a.lage.find(z => z.label === "Bedarf") || {wert: ""}).wert.split("·").map(s => s.trim()).filter(Boolean).length;
        if (n < 2 || n > 3) fehler.push(`vlsm/AP1/${seed}: ${n} Netze (2–3 erwartet)`);
      }
      const b = auf("vlsm", "AP2", seed);
      if (b){
        const n = (b.lage.find(z => z.label === "Bedarf") || {wert: ""}).wert.split("·").map(s => s.trim()).filter(Boolean).length;
        if (n < 4 || n > 5) fehler.push(`vlsm/AP2/${seed}: ${n} Netze (4–5 erwartet)`);
        if (!/Reserve/.test(b.lage.map(z => z.wert).join(" ") + b.rechenweg.map(s => s.text).join(" ") + b.frage)) fehler.push(`vlsm/AP2/${seed}: Reserve kommt nicht vor`);
      }
    }
    /* VLAN: E nur ein Access-Port (lage), AP2 Trunk/Tagging nachweisbar. */
    for (let seed = 1; seed <= 10; seed++){
      const e = auf("vlan-port", "E", seed);
      if (e && !/VLAN/.test(json(e.lage))) fehler.push(`vlan-port/E/${seed}: kein VLAN in der lage`);
      const t = auf("trunk", "AP2", seed);
      if (t && !/Native VLAN|Allowed VLANs/.test(json(t.lage) + t.frage)) fehler.push(`trunk/AP2/${seed}: Trunk-Angaben fehlen`);
    }
    erwarte.gleich(fehler.slice(0, 10), [], `Stufen-Spezifika verletzt (${fehler.length} gefunden)`);
  });

  /* ================= 11. Fachbefunde der Didaktik-Prüfung (Review) ================= */
  pruefe("Review B1/B3/B5: kein /31 als Netz-ID/Broadcast, Trunk-Optionen semantisch eindeutig, Zusammenfassen-Erklärung korrekt", () => {
    const fehler = [];
    /* B1: /31 hat nach RFC 3021 keine Netz- und keine Broadcastadresse → solche Aufgaben entstehen nicht. */
    for (let seed = 1; seed <= 40; seed++){
      for (const art of ["netzid", "broadcast"]){
        const a = auf(art, "AP2", seed);
        if (!a) continue;
        const text = a.frage + " " + a.lage.map(z => z.wert).join(" ") + " " + a.rechenweg.map(s => s.text).join(" ");
        if (/\/31\b/.test(text)) fehler.push(`${art}/AP2/${seed}: /31 im Aufgabenweg (RFC 3021: kein Broadcast)`);
      }
    }
    /* B3: Trunk-Optionen bedeuten genau einmal dasselbe — „1“ und „VLAN 1“ dürfen nicht zwei Optionen sein. */
    const vlanBedeutung = text => {
      const treffer = /^VLAN (\d+)$/.exec(String(text).trim());
      if (treffer) return "vlan:" + treffer[1];
      if (/verworfen/i.test(String(text))) return "verworfen";
      return "text:" + text;
    };
    for (let seed = 1; seed <= 40; seed++){
      const a = auf("trunk", "AP2", seed);
      if (!a) continue;
      const texte = a.eingabe.optionen.map(o => o.text);
      const bedeutungen = texte.map(vlanBedeutung);
      if (new Set(bedeutungen).size !== bedeutungen.length) fehler.push(`trunk/AP2/${seed}: Optionen mit gleicher Bedeutung: ${texte.join(" | ")}`);
      if (bedeutungen.filter(b => b === vlanBedeutung(a.loesung.wert)).length !== 1) fehler.push(`trunk/AP2/${seed}: Lösung nicht eindeutig`);
      /* S7: das Native VLAN steht in der Allowed-Liste (typischer Cisco-Zustand). */
      const lageText = a.lage.map(z => z.wert).join(" ");
      const native = /Native VLAN (\d+)/.exec(lageText);
      const allowed = /Allowed VLANs ([\d, ]+)/.exec(lageText);
      if (native && allowed && !allowed[1].split(",").map(s => s.trim()).includes(native[1]))
        fehler.push(`trunk/AP2/${seed}: Native VLAN ${native[1]} fehlt in der Allowed-Liste`);
    }
    /* B5: die Erklärung nennt die tatsächliche Abdeckung der schmaleren Route (n/2 Netze). */
    for (let seed = 1; seed <= 20; seed++){
      const a = auf("zusammenfassen", "AP2", seed);
      if (!a) continue;
      const n = a.lage.length;
      const wort = n === 4 ? "zwei Netze" : n === 2 ? "ein Netz" : `${n / 2} Netze`;
      if (!a.erklaerung.includes(wort)) fehler.push(`zusammenfassen/AP2/${seed}: Erklärung nennt nicht „nur ${wort}“`);
    }
    erwarte.gleich(fehler.slice(0, 10), [], `Review-Befunde noch offen (${fehler.length} gefunden)`);
  });

  pruefe("Review S6/S8/S9: vlan-port-E-Lage vollständig, vlan-erreichbar mit IP, subnetze-AP2 mit Gegenprobe", () => {
    const fehler = [];
    /* S8: Ziel-Port und Ziel-VLAN stehen in der lage, nicht nur im Fragetext. */
    for (let seed = 1; seed <= 20; seed++){
      const a = auf("vlan-port", "E", seed);
      if (!a) continue;
      const lageText = a.lage.map(z => z.label + " " + z.wert).join(" ");
      for (const m of a.frage.matchAll(/Fa0\/\d+/g)) if (!lageText.includes(m[0])) fehler.push(`vlan-port/E/${seed}: ${m[0]} fehlt in der lage`);
      for (const m of a.frage.matchAll(/VLAN (\d+)/g)) if (!lageText.includes("VLAN " + m[1])) fehler.push(`vlan-port/E/${seed}: VLAN ${m[1]} fehlt in der lage`);
    }
    /* S9: vlan-erreichbar/AP1 nennt IP und Maske — „erreichbar“ braucht ein Subnetz, nicht nur ein VLAN. */
    for (let seed = 1; seed <= 10; seed++){
      const a = auf("vlan-erreichbar", "AP1", seed);
      if (!a) continue;
      const lageText = a.lage.map(z => z.wert).join(" ");
      const ips = lageText.match(/\b\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}\b/g) || [];
      if (ips.length < 2) fehler.push(`vlan-erreichbar/AP1/${seed}: weniger als zwei IP/Maske-Angaben in der lage`);
    }
    /* S6: AP2-subnetze prüft das Ergebnis mit einer Gegenprobe. */
    for (let seed = 1; seed <= 10; seed++){
      const a = auf("subnetze", "AP2", seed);
      if (a && !/Gegenprobe/.test(a.rechenweg.map(s => s.text).join(" ") + a.erklaerung)) fehler.push(`subnetze/AP2/${seed}: keine Gegenprobe`);
    }
    erwarte.gleich(fehler.slice(0, 10), [], `Soll-Befunde noch offen (${fehler.length} gefunden)`);
  });

  /* ================= 12. § 5 Lösungsschritte: E=1, AP1 2–3, AP2 3–5 ================= */
  pruefe("Lösungsschritte: E genau 1, AP1 2–3 variiert, AP2 3–5 variiert; der Anzeige-Rechenweg bleibt 3–6", () => {
    const gesehen = {E: new Set(), AP1: new Set(), AP2: new Set()};
    for (const {art, stufe} of paare()){
      for (let seed = 1; seed <= 10; seed++){
        const a = auf(art, stufe, seed);
        if (!a) continue;
        const [lo, hi] = LOESUNGSSCHRITTE[stufe];
        erwarte.wahr(a.loesungsschritte >= lo && a.loesungsschritte <= hi, `${art}/${stufe}/${seed}: ${a.loesungsschritte} Lösungsschritte`);
        erwarte.wahr(a.rechenweg.length >= 3 && a.rechenweg.length <= 6, `${art}/${stufe}/${seed}: Anzeige-Rechenweg ${a.rechenweg.length} (3–6)`);
        gesehen[stufe].add(a.loesungsschritte);
      }
    }
    erwarte.gleich([...gesehen.E], [1], "E hat genau einen Lösungsschritt");
    erwarte.wahr(gesehen.AP1.has(2) && gesehen.AP1.has(3), "AP1 variiert zwischen 2 und 3 Lösungsschritten: " + [...gesehen.AP1].join(", "));
    erwarte.wahr(gesehen.AP2.size >= 3, "AP2 variiert über 3–5 Lösungsschritte: " + [...gesehen.AP2].join(", "));
  });
});
