"use strict";
/* ---------- Mini-Tickets für die Leiste (Konzept § 3.2 „Mini“, § 3.4) ----------
   Spiel.mini.naechstes() → Mini (Auswahl: Unterrichtsthema → fällige Fertigkeiten → häufige Fehler → schwächste der Stufe)
   Spiel.mini.antworten(id, antwort) → {richtig, erklaerung, lohn, loesung}   (Lernmotor + kleiner Lohn)
   Spiel.mini.fuerSkill(skill), Spiel.mini.setzen(id)   (Training aus Lernstand und Playbooks)
   Antwortformen: wahl/vorhersage = Index · reihenfolge = Indexliste · zuordnen = Paare [links, rechts].

   ---------- WIEDERHOLUNGSSPERRE (task-16, Nutzerauftrag „Aufträge dürfen sich nicht so schnell wiederholen“) ----------
   VORHER (gemessen, 20 Runden über den echten Weg naechstes()+antworten()): nur 11 verschiedene
   Minis, 9 Wiederholungen, kleinster Abstand 7 Runden. Ursache: `fuerSkill` filterte die Minis einer
   Fertigkeit nach „nicht in s.zuletzt“ und fiel, sobald dieser Filter leer war, auf ALLE Minis zurück –
   die meisten Fertigkeiten haben nur 3–5 Minis. Dieselbe Frage kam also nach drei Runden wieder.

   JETZT: ROTATION statt Filter. Je Fertigkeit kommt jedes Mini einmal dran, bevor sich eines
   wiederholt; bei echter Erschöpfung das am LÄNGSTEN nicht gespielte (nicht ein beliebiges).
   Der Zustand liegt im Spielstand (`st.mini`), übersteht einen Neustart und ist deterministisch:
   der Reihenfolge-Zufall kommt ausschließlich aus `Zufall()` (src/kern/basis.js), nie aus Math.random.

     st.mini.zug      Anzahl der beantworteten Minis (Zugnummer; fehlt sie, gilt richtig+falsch)
     st.mini.gespielt {[miniId]: Zugnummer der letzten Antwort} – 0/fehlend = noch nie gespielt
     st.mini.zuletzt  die letzten 25 beantworteten Minis = das Sperrfenster (Spiel.MINI.SPERRE)

   Ein Mini ist GESPERRT, solange es in `zuletzt` steht: es kommt erst wieder, wenn 25 andere Minis
   beantwortet wurden ODER es keine Alternative mehr gibt. `naechstes()` probiert dann lieber die
   nächste Fertigkeit, statt dasselbe Mini erneut zu liefern. Alte Spielstände ohne `zug`/`gespielt`
   bekommen beides aus `richtig+falsch` und `zuletzt` rekonstruiert (stand()) – kein Bruch.

   GENERIERTE FRAGEN (task-18, eingehängt). `Spiel.fragen` (src/spiel/fragen.js) erzeugt aus geprüften
   Vorlagen immer neue Aufgaben. Sie laufen NICHT in `Spiel.mini.alle()` mit – an dieser Liste hängen
   Zusicherungen über den FESTEN Bestand (92 Minis, lab.ping genau 6, mini-link-2 ohne Denkhilfe).
   Erreicht werden sie an genau zwei Stellen:
     · `fuerSkill(skill, {ohne})`: gibt es ein frisches festes Mini, gewinnt es (Rotation). Ist die
       Fertigkeit erschöpft, kommt die generierte Frage; sonst wie bisher das am längsten nicht
       gespielte feste Mini. Der Seed kommt aus dem Spielstand (Zugnummer + Fortschritt dieser
       Fertigkeit), nie aus der Uhr – dieselbe Lage ergibt dieselbe Frage.
     · `von(id)`: die ID `gf-<vorlage>-<seed>` trägt die Frage in sich und wird daraus wieder
       aufgebaut; sie braucht keinen Eintrag im Spielstand und übersteht einen Neustart.
   Eine generierte Frage hat keinen Denkhilfen-Eintrag: `hilfe` fällt für sie auf den Fertigkeitssatz
   zurück (kein Sonderweg, § 5). */
Spiel.mini = {};
/* SPROSSEN = Denkhilfen je Frage nach Bildungsstand (Vertrag § 2) · HILFE_KONTO = freie Hilfen je Mini-Runde (§ 2.1).
   Beide Zahlen stehen im Vertrag. Liegt Spiel.HILFE_KONTO aus Baustein A vor, hat es Vorrang (miniKonto). */
Spiel.MINI = {LOHN: {E: 2, AP1: 3, AP2: 5}, SPERRE: 25,
  /* Anteil der generierten Fragen an den Runden (task-18): jede dritte Frage darf eine generierte
     sein. Ohne diese Aufteilung gewänne die generierte Frage JEDE Runde – sie ist immer „noch nie
     gespielt“ – und die feste Rotation der übrigen Fertigkeiten käme nie mehr dran (gemessen: 3 statt
     8 Fertigkeiten in 20 Runden, 51 statt 65 feste Minis in 120 Runden). 0 schaltet sie ab. */
  GENERIERT: 3,
  SPROSSEN: {azubi: 2, "azubi-plus": 1, geselle: 1, meister: 0},
  HILFE_KONTO: {azubi: 6, "azubi-plus": 4, geselle: 2, meister: 0},
  DENKANSTOSS: "Was in der Aufgabe entscheidet? Such die eine Angabe, die den Unterschied macht, und prüf sie gegen die Regel."};

Spiel.mini.stand = function(){
  const st = Spiel.st;
  st.mini ||= {aktuell: null, zuletzt: [], richtig: 0, falsch: 0};
  const s = st.mini;
  /* Mit der Hilfestellung (§ 2, § 5): geöffnete Denkhilfen dieser Runde und die falsch beantworteten
     Minis (für „geselle erst nach einer falschen Antwort"). Alte Stände bekommen beides leer. */
  if (!Array.isArray(s.hilfen)) s.hilfen = [];
  if (!Array.isArray(s.falschIds)) s.falschIds = [];
  /* Wiederholungssperre (task-16): alte und halbe Stände in die neue Form bringen, ohne zu werfen.
     `zuletzt` kaputt → leer · `zug` fehlt → aus den Antwortzählern · `gespielt` fehlt → aus dem
     Sperrfenster rekonstruieren (ältester Eintrag = kleinste Zugnummer). Ein Stand von vor dem Umbau
     vergisst so seine Reihenfolge nicht. */
  if (!Array.isArray(s.zuletzt)) s.zuletzt = [];
  if (typeof s.richtig !== "number" || !isFinite(s.richtig)) s.richtig = 0;
  if (typeof s.falsch !== "number" || !isFinite(s.falsch)) s.falsch = 0;
  if (typeof s.zug !== "number" || !isFinite(s.zug) || s.zug < 0) s.zug = s.richtig + s.falsch;
  if (!s.gespielt || typeof s.gespielt !== "object" || Array.isArray(s.gespielt)) s.gespielt = {};
  if (!Object.keys(s.gespielt).length && s.zuletzt.length) {
    s.zuletzt.forEach((id, i) => { if (id && s.gespielt[id] == null) s.gespielt[id] = i + 1; });
  }
  return s;
};
Spiel.mini.alle = () => (DATEN.mini || []).filter(m => m && m.id && m.skill);
/* DIE QUELLE DER AUSWAHL – der eine Einspeisepunkt für generierte Fragen (task-18, siehe Kopf).
   Heute ist das der feste Bestand aus DATEN.mini. Wer hier erweitert, erweitert die Auswahl überall
   (fuerSkill, naechstes, von), ohne die Rotation unten anzufassen. */
Spiel.mini.quelle = () => Spiel.mini.alle();
Spiel.mini.von = function(id){
  const m = Spiel.mini.quelle().find(x => x.id === id);
  if (m) return m;
  /* Generierte Frage (task-18): `gf-<vorlage>-<seed>` baut sie selbst wieder auf – auch nach einem
     Neustart, ohne Eintrag im Spielstand (Spiel.fragen.von greift auf den Zwischenspeicher und
     sonst auf die ID zurück). */
  const F = typeof Spiel.fragen !== "undefined" && Spiel.fragen;
  return (F && typeof F.von === "function" && F.von(id)) || null;
};

/* passend zum Niveau: E-Spieler bekommen E und AP1, AP2-Spieler alles */
Spiel.mini.passtNiveau = function(m){
  const n = typeof Spiel.karriere !== "undefined" && Spiel.karriere.niveau ? Spiel.karriere.niveau() : "E";
  if (n === "E") return m.stufe !== "AP2";
  return true;
};
/* Zugnummer eines Minis: 0 = noch nie gespielt, sonst der Zug der letzten Antwort. */
function miniZug(s, id){
  const z = s.gespielt[id];
  return typeof z === "number" && isFinite(z) ? z : 0;
}
/* ROTATION: am längsten nicht gespielt zuerst. Bei Gleichstand entscheidet eine deterministische
   Mischung aus (Fertigkeit, Zugnummer, Kennung): derselbe Spielstand ergibt dieselbe Reihenfolge,
   ein neuer Zug mischt die noch nie gespielten Minis neu. Kein Datum, kein Math.random. */
function miniReihe(kand, s){
  const zug = s.zug || 0;
  return kand
    .map(m => ({m, z: miniZug(s, m.id), t: Zufall("mini-reihe:" + m.skill + ":" + zug + ":" + m.id).zahl(1000000)}))
    .sort((a, b) => a.z - b.z || a.t - b.t || (a.m.id < b.m.id ? -1 : a.m.id > b.m.id ? 1 : 0))
    .map(x => x.m);
}
/* Die Sperre: dieses Mini stand in den letzten Spiel.MINI.SPERRE Antworten (Fenster = `zuletzt`). */
Spiel.mini.gesperrt = function(id){ return Spiel.mini.stand().zuletzt.includes(id); };
/* EINE generierte Frage dieser Fertigkeit (task-18) oder null.
   Der Seed kommt aus dem Spielstand: alle Antworten (`s.zug`) plus die Zahl der festen Minis DIESER
   Fertigkeit, die schon dran waren. Mit jeder Antwort ändert er sich, ohne Antwort bleibt er gleich –
   dieselbe Lage ergibt dieselbe Frage, und die ID `gf-<vorlage>-<seed>` ist daraus wieder herstellbar.
   `ohne` bekommt zusätzlich das Sperrfenster: was gerade dran war, wird nicht noch einmal erzeugt.
   Zum Niveau passende Fragen zuerst; der Generator würfelt seine Vorlage, deshalb wird mit den
   nächsten Seeds nachgefragt (begrenzt). Findet sich nichts Passendes, gilt derselbe Rückfall wie bei
   den festen Minis – „nichts Passendes“ heißt dort nicht „nichts“ (passtNiveau ist eine Vorliebe). */
function miniGeneriert(skill, s, ohne){
  const F = typeof Spiel.fragen !== "undefined" && Spiel.fragen;
  if (!F || typeof F.fuerSkill !== "function") return null;      /* ohne task-18: nur feste Minis */
  const fest = Spiel.mini.quelle().filter(m => m.skill === skill);
  const basis = (s.zug || 0) + fest.filter(m => miniZug(s, m.id) > 0).length;
  let erster = null;
  for (let versuch = 0; versuch < 4; versuch++) {
    const g = F.fuerSkill(skill, {ohne, seed: basis + versuch});
    if (!g) continue;
    if (Spiel.mini.passtNiveau(g)) return g;
    if (!erster) erster = g;
  }
  return erster;
}
/* Das nächste Mini EINER Fertigkeit (Training, Playbooks, naechstes).
   Reihenfolge: frisches festes Mini (Rotation) → generierte Frage (task-18) → das am längsten nicht
   gespielte feste Mini. Mit `gesperrt:true` kommt null heraus, wenn nichts Frisches da ist; so kann
   naechstes() die nächste Fertigkeit probieren, statt eine Frage von eben zu wiederholen. */
Spiel.mini.fuerSkill = function(skill, {ohne = [], gesperrt = false} = {}){
  const s = Spiel.mini.stand();
  const kand = Spiel.mini.quelle().filter(m => m.skill === skill && !ohne.includes(m.id));
  /* Zum Niveau passende Minis zuerst; gibt es keine, zählt der ganze Bestand (wie bisher). */
  const passt = kand.filter(m => Spiel.mini.passtNiveau(m));
  const reihe = miniReihe(passt.length ? passt : kand, s);
  const frisch = reihe.find(m => !Spiel.mini.gesperrt(m.id));
  if (frisch) return frisch;
  const g = miniGeneriert(skill, s, ohne.concat(s.zuletzt));
  if (g) return g;
  if (gesperrt) return null;
  return reihe[0] || null;
};
Spiel.mini.setzen = function(id){ Spiel.mini.stand().aktuell = id; Spiel.speichern(); };

Spiel.mini.naechstes = function(){
  const s = Spiel.mini.stand();
  if (s.aktuell && Spiel.mini.von(s.aktuell)) return Spiel.mini.von(s.aktuell);
  const st = Spiel.st;
  const freigegeben = (DATEN.skills || []).filter(x => (x.stufe || 1) <= Math.max(1, st.stufe)).map(x => x.id);
  const vorhanden = new Set(Spiel.mini.quelle().map(m => m.skill));
  const kandidaten = [];
  const u = Spiel.einst && Spiel.einst.unterricht;
  if (u) kandidaten.push(u);
  if (typeof L !== "undefined") {
    kandidaten.push(...L.faelligeIds(id => id.startsWith("lab.")));
    kandidaten.push(...L.haeufigeFehler(14).map(f => f.id).filter(id => String(id).startsWith("lab.")));
    kandidaten.push(...freigegeben.slice().sort((a, b) => L.box(a) - L.box(b)));
  } else kandidaten.push(...freigegeben);
  /* Erst eine Fertigkeit mit einem freien (nicht gesperrten) Mini – lieber die nächste Fertigkeit als
     dieselbe Frage noch einmal. Die Sperre gewinnt also gegen die Reihenfolge der Kandidaten.
     Die Köpfe werden nach Art getrennt: feste Minis (Rotation) und generierte Fragen (task-18). */
  const letzter = s.zuletzt.length ? Spiel.mini.von(s.zuletzt[s.zuletzt.length - 1]) : null;
  const letzteFertigkeit = letzter ? letzter.skill : null;
  const feste = [], generierte = [], schonDa = new Set();
  kandidaten.forEach((skill, rang) => {
    if (schonDa.has(skill) || !vorhanden.has(skill)) return;
    schonDa.add(skill);
    const k = Spiel.mini.fuerSkill(skill, {gesperrt: true});
    if (!k) return;
    (k.generiert ? generierte : feste).push({skill, m: k, rang});
  });
  /* Aus den Köpfen gewinnt der am LÄNGSTEN nicht gespielte. Bei Gleichstand – typisch, solange es
     noch nie gespielte Minis gibt – zuerst eine ANDERE Fertigkeit als die zuletzt gespielte (das
     mischt die Themen), dann die Reihenfolge des Lernstands (Unterricht, fällig, Fehler, schwächste).
     Ohne diese Auswahl bliebe die Rotation an den ersten Fertigkeiten hängen und der Rest des
     Vorrats käme nie dran. */
  const ordnen = liste => liste.slice().sort((a, b) =>
    miniZug(s, a.m.id) - miniZug(s, b.m.id)
    || (a.skill === letzteFertigkeit ? 1 : 0) - (b.skill === letzteFertigkeit ? 1 : 0)
    || a.rang - b.rang
    || (a.m.id < b.m.id ? -1 : a.m.id > b.m.id ? 1 : 0));
  const nimm = liste => { const l = ordnen(liste); return l.length ? l[0].m : null; };
  /* Jede Spiel.MINI.GENERIERT-te Frage darf generiert sein, sonst gewinnt die feste Rotation.
     Die Aufteilung hängt nur an der Zugnummer (Spielstand), nicht an der Uhr. */
  const anteil = Math.max(0, Number(Spiel.MINI.GENERIERT) || 0);
  const generierteDran = anteil > 0 && (s.zug + 1) % anteil === 0;
  let m = (generierteDran ? nimm(generierte) : null) || nimm(feste) || nimm(generierte);
  /* Echte Erschöpfung (keine Fertigkeit frei, keine generierte Frage): das am längsten nicht
     gespielte Mini des ganzen Vorrats. Ist auch das nicht frei, greift überhaupt erst eine
     Wiederholung – dann ebenfalls das am längsten nicht gespielte. */
  if (!m) {
    const frei = Spiel.mini.quelle().filter(x => !s.zuletzt.includes(x.id));
    const reihe = frei.length ? miniReihe(frei, s) : miniReihe(Spiel.mini.quelle(), s);
    m = reihe[0] || null;
  }
  if (m) { s.aktuell = m.id; Spiel.speichern(); }
  return m;
};

Spiel.mini.pruefen = function(m, antwort){
  if (m.art === "wahl" || m.art === "vorhersage") return +antwort === +m.richtig;
  if (m.art === "reihenfolge") return Array.isArray(antwort) && JSON.stringify(antwort.map(Number)) === JSON.stringify(m.richtig.map(Number));
  if (m.art === "zuordnen") {
    if (!Array.isArray(antwort)) return false;
    const soll = new Set(m.richtig.map(p => p.join("-"))), ist = new Set(antwort.map(p => p.join("-")));
    return soll.size === ist.size && [...soll].every(x => ist.has(x));
  }
  return false;
};
Spiel.mini.loesungText = function(m){
  if (m.art === "wahl" || m.art === "vorhersage") return m.optionen[m.richtig];
  if (m.art === "reihenfolge") return m.richtig.map(i => m.optionen[i]).join(" → ");
  if (m.art === "zuordnen") return m.richtig.map(([l, r]) => `${m.optionen.links[l]} ↔ ${m.optionen.rechts[r]}`).join(" · ");
  return "";
};
Spiel.mini.antworten = function(id, antwort){
  const m = Spiel.mini.von(id); if (!m) return null;
  const s = Spiel.mini.stand();
  const richtig = Spiel.mini.pruefen(m, antwort);
  s.aktuell = null;
  s.zuletzt.push(m.id); if (s.zuletzt.length > Spiel.MINI.SPERRE) s.zuletzt.splice(0, s.zuletzt.length - Spiel.MINI.SPERRE);
  /* Wiederholungssperre (task-16): Zugnummer fortschreiben und merken, wann dieses Mini dran war.
     `zuletzt` ist zugleich das Sperrfenster (die letzten Spiel.MINI.SPERRE Antworten). */
  s.zug = (s.zug || 0) + 1;
  s.gespielt[m.id] = s.zug;
  /* Der Merker wächst nur mit dem Vorrat (92 feste Minis). Für einen späteren Generator (task-18)
     bleibt er gedeckelt: die ältesten Einträge fallen zuerst weg. */
  const merker = Object.keys(s.gespielt);
  if (merker.length > 400) {
    merker.sort((a, b) => s.gespielt[a] - s.gespielt[b]);
    for (const alt of merker.slice(0, merker.length - 400)) delete s.gespielt[alt];
  }
  if (richtig) s.richtig++;
  else {
    s.falsch++;
    /* Für „geselle erst nach einer falschen Antwort" (§ 2): dieses Mini wurde schon danebengegriffen. */
    if (!s.falschIds.includes(m.id)) s.falschIds.push(m.id);
    if (s.falschIds.length > Spiel.MINI.SPERRE) s.falschIds.splice(0, s.falschIds.length - Spiel.MINI.SPERRE);
  }
  let lohn = 0;
  if (!Spiel._trocken && typeof L !== "undefined") {
    Spiel.skillsRegistrieren();
    L.ueben(m.skill, richtig);
    if (!richtig) L.fehler("labor-mini", m.skill, m.frage);
  }
  if (richtig) { lohn = Spiel.MINI.LOHN[m.stufe] || 2; Spiel.gutschreiben(lohn, 0, "Mini-Ticket"); }
  else Spiel.speichern();
  Spiel.melden("mini", {m, richtig});
  return {richtig, erklaerung: m.erklaerung, lohn, loesung: Spiel.mini.loesungText(m), quelle: m.quelle};
};

/* ---------- Denkhilfe und Lernanker (Vertrag § 2, § 5) ----------
   Spiel.mini.hilfe(id, {nurSehen}?) → {text, art:"denkhilfe"|"ausschnitt", frei, grund} | null   (NIE die Lösung)
   Spiel.mini.anker(id)             → {titel, text, quelle, wiki:skillId|null, stichwort} | null (nach der Antwort)

   Stufen (§ 2): azubi zwei Sprossen je Frage · azubi-plus eine · geselle eine, erst nach einer falschen
   Antwort · meister keine. Sprosse 1 ist der Denkanstoß zu DIESER Frage: er kommt aus
   DATEN.miniDenkhilfen (src/daten/mini-denkhilfen.js), sonst als Rückfall aus dem Fertigkeitssatz
   (Spiel.SENIOR_FRAGEN, Spiel.WERKZEUGE) — kein neues Datenpaket im Spiel selbst (§ 5).
   Jeder Text wird gegen Spiel.mini.loesungText(m) und die Optionen geprüft und fällt sonst auf einen
   allgemeinen Denkanstoß zurück.
   Die Bedingung „erst nach einem Fehler" wird NICHT hier nachgebaut: sie kommt aus
   Spiel.stufe.wannPasst (Befund B2 der Gegenprüfung), `grund` von dort wird durchgereicht.
   Der bestehende Bewertungsweg bleibt unberührt: hilfe() und anker() rufen L.ueben nicht auf.
   Alle Zugriffe auf Baustein A (Spiel.stufe) und auf DATEN.miniDenkhilfen sind defensiv — ohne sie
   gilt „azubi" bzw. der Fertigkeitssatz. */

/* Rang 1..4 aus Baustein A; ohne Spiel.stufe (oder bei Wurf) Rückfall „azubi". */
function miniRang(){
  try {
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.rang === "function") {
      const r = Math.round(Number(Spiel.stufe.rang()));
      if (r >= 1 && r <= 4) return r;
    }
  } catch (e) { /* Baustein A fehlt oder würfelt – Rückfall azubi */ }
  return 1;
}
function miniStufenId(rang){ return {1: "azubi", 2: "azubi-plus", 3: "geselle", 4: "meister"}[rang] || "azubi"; }
/* Schalterfragen aus § 2: bei meister gibt es weder Hilfe-Knopf noch Anker (darf(...) === false). */
function miniSchalter(frage){
  try {
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.darf === "function") return Spiel.stufe.darf(frage) !== false;
  } catch (e) { /* Rückfall: erlaubt */ }
  return true;
}
/* WANN erscheint die Fläche? Das beantwortet Baustein A (Spiel.stufe.wannPasst, § 2.2) – die
   Fehler-Regel („geselle erst nach einem Fehler") wird hier nicht mehr nachgebaut (Befund B2).
   Fehlt Spiel.stufe oder wannPasst, gilt der Rückfall „azubi": die Fläche ist sofort da. */
function miniWannPasst(flaeche, fehler){
  try {
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.wannPasst === "function") {
      const r = Spiel.stufe.wannPasst(flaeche, {fehler: !!fehler});
      if (r && typeof r.ja === "boolean") return r;
    }
  } catch (e) { /* Baustein A fehlt oder würfelt – Rückfall azubi */ }
  return {ja: true, grund: "Ohne Stufensystem gilt azubi: sofort sichtbar."};
}
/* Freie Hilfen dieser Stufe. Quelle ist der Vertrag § 2.1 über `Spiel.HILFE_KONTO` (Baustein A).
   Die früheren zwei Rückfallzweige (`Spiel.stufe.kann("konto")` und `Spiel.MINI.HILFE_KONTO`) waren
   nachweislich unerreichbar: `Spiel.HILFE_KONTO` ist eine feste Tabelle und antwortet für jede gültige
   id — gefunden im Review „Testqualität" als toter Zweig (07.10.2026). Erhalten bleibt der Rückfall für
   den Fall, dass Baustein A ganz fehlt (Testkapseln löschen `Spiel.HILFE_KONTO`), denn dann gilt der
   Rückfall `Spiel.MINI.HILFE_KONTO` aus dem Vertrag. */
function miniKonto(rang){
  const id = miniStufenId(rang);
  const k = Spiel.HILFE_KONTO;
  if (k && typeof k[id] === "number") return Math.max(0, k[id]);
  return Spiel.MINI.HILFE_KONTO[id] || 0;
}
function miniKlein(x){ return String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim(); }
function miniOptionen(m){
  if (m.art === "zuordnen" && m.optionen) return [...(m.optionen.links || []), ...(m.optionen.rechts || [])];
  return Array.isArray(m.optionen) ? m.optionen : [];
}
/* Nennt der Text eine Option wörtlich? Punkt, Schrägstrich und Bindestrich zählen als Wortzeichen,
   sonst schlüge „192.168.1.0“ in „192.168.1.0/24“ falsch an. */
function miniNenntOption(text, option){
  const t = miniKlein(text), w = miniKlein(option);
  if (!w || w.length < 4) return false;
  return new RegExp("(^|[^a-z0-9./-])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9./-]|$)").test(t);
}
/* Der Text darf den Lösungstext weder enthalten noch ein Teil davon sein (Vertrag § 5).
   pruefeOptionen gilt für Denkhilfen; ein Ausschnitt aus der Aufgabe darf zitieren, was ohnehin dasteht. */
function miniOhneLoesung(text, m, pruefeOptionen){
  const t = String(text == null ? "" : text).trim();
  if (!t) return null;
  const l = miniKlein(Spiel.mini.loesungText(m));
  if (l) {
    const k = miniKlein(t);
    if (k.includes(l)) return null;
    if (k.length > 3 && l.includes(k)) return null;
  }
  if (pruefeOptionen) for (const o of miniOptionen(m)) if (miniNenntOption(t, o)) return null;
  return t;
}
/* Der Eintrag des Datenpakets zu genau dieser Frage – oder null (fehlendes Paket wirft nie). */
function miniEigener(m){
  try {
    const d = typeof DATEN !== "undefined" && DATEN && DATEN.miniDenkhilfen;
    const e = d && m && m.id ? d[m.id] : null;
    return e && typeof e === "object" ? e : null;
  } catch (e) { return null; }
}
/* Sprosse 1: erst der fragebezogene Denkanstoß (src/daten/mini-denkhilfen.js), dann der
   Fertigkeitssatz (SENIOR_FRAGEN/WERKZEUGE) wie bisher – die Frage gewinnt gegen die Fertigkeit. */
function miniDenktext(m){
  const eigen = miniEigener(m);
  if (eigen && typeof eigen.denkhilfe === "string" && eigen.denkhilfe.trim()) return eigen.denkhilfe.trim();
  const f = Spiel.SENIOR_FRAGEN && Spiel.SENIOR_FRAGEN[m.skill];
  const w = Spiel.WERKZEUGE && Spiel.WERKZEUGE[m.skill];
  return String(f || w || Spiel.MINI.DENKANSTOSS);
}
/* Sprosse 2 (Ausschnitt): erst der eigene, wörtliche Ausschnitt der Frage, sonst der Schnappschuss,
   sonst der erste Satz der Frage. */
function miniAusschnitt(m){
  const eigen = miniEigener(m);
  if (eigen && typeof eigen.ausschnitt === "string" && eigen.ausschnitt.trim()) return eigen.ausschnitt.trim();
  const s = m.schnappschuss && m.schnappschuss.inhalt ? String(m.schnappschuss.inhalt).trim() : "";
  if (s) return s.split("\n").slice(0, 4).join("\n");
  const f = String(m.frage || "").trim();
  const i = f.search(/[.?!](\s|$)/);
  return i < 0 ? f : f.slice(0, i + 1);
}
/* Kernbegriff der Frage: für den Lernanker (Spiel.mini.anker.stichwort) und für die Oberfläche,
   die damit den passenden Wiki-Abschnitt aufschlagen kann. Ohne eigenen Eintrag: der Name der
   Fertigkeit – nie leer, nie ein Wurf. */
function miniStichwort(m){
  const eigen = miniEigener(m);
  if (eigen && typeof eigen.stichwort === "string" && eigen.stichwort.trim()) return eigen.stichwort.trim();
  return String(Spiel.skill(m.skill).name || m.skill);
}

/* Die nächste Denkhilfe. nurSehen:true fragt nur, ohne eine Sprosse zu verbrauchen (für den Knopf).
   „Gibt es die Fläche?" (darf) und „wann erscheint sie?" (wannPasst) beantwortet Baustein A. */
Spiel.mini.hilfe = function(id, {nurSehen = false} = {}){
  const m = Spiel.mini.von(id);
  if (!m) return null;
  const s = Spiel.mini.stand();
  if (!miniSchalter("miniHilfe")) return null;                                  /* meister: nein (§ 2) */
  const wann = miniWannPasst("miniHilfe", s.falschIds.includes(m.id));          /* geselle: erst nach Fehler (§ 2.2) */
  if (!wann.ja) return null;
  const rang = miniRang();
  const sprossen = Math.max(0, Number(Spiel.MINI.SPROSSEN[miniStufenId(rang)]) || 0);
  if (!sprossen) return null;
  const offen = s.hilfen.filter(h => h && h.id === m.id).length;
  if (offen >= sprossen) return null;                                           /* Sprossen dieser Frage erschöpft */
  const sprosse = offen + 1;
  let art = sprosse === 1 ? "denkhilfe" : "ausschnitt";
  let text = sprosse === 1 ? miniOhneLoesung(miniDenktext(m), m, true) : miniOhneLoesung(miniAusschnitt(m), m, false);
  if (!text) { art = "denkhilfe"; text = miniOhneLoesung(Spiel.MINI.DENKANSTOSS, m, true); }
  if (!text) return null;
  const frei = s.hilfen.length < miniKonto(rang);                               /* § 2.1: leer heißt nicht gesperrt */
  if (!nurSehen) {
    s.hilfen.push({id: m.id, sprosse, art, frei});
    if (s.hilfen.length > 200) s.hilfen.splice(0, s.hilfen.length - 200);
    Spiel.speichern();
  }
  return {text, art, frei, grund: wann.grund};                                  /* Begründung kommt aus dem Stufensystem */
};

/* Der Lernanker: erscheint nach der Antwort, nennt die Quelle und verknüpft Fertigkeit + Wiki (§ 5).
   Auch hier gilt die WANN-Regel aus Baustein A (geselle: nur bei Fehler, meister: nie). */
Spiel.mini.anker = function(id){
  const m = Spiel.mini.von(id);
  if (!m) return null;
  if (!miniSchalter("anker")) return null;                                      /* meister: nein (§ 2) */
  if (!miniWannPasst("anker", Spiel.mini.stand().falschIds.includes(m.id)).ja) return null;
  const w = (typeof DATEN !== "undefined" && DATEN.wiki && DATEN.wiki[m.skill]) || null;
  const name = Spiel.skill(m.skill).name;
  /* stichwort = Kernbegriff DIESER Frage (aus dem Datenpaket; sonst der Fertigkeitsname). Damit kann
     die Oberfläche später den passenden Abschnitt aufschlagen – die Seite allein nennt ihn oft nicht. */
  const stichwort = miniStichwort(m);
  const text = w
    ? `Diese Frage gehört zur Fertigkeit „${name}“. Im Wiki steht das Nachschlagen unter „${w.titel}“${w.merksatz ? ": " + w.merksatz : "."}`
    : `Diese Frage gehört zur Fertigkeit „${name}“. Dafür gibt es noch keine Wiki-Seite – die Quelle unten ist der Beleg.`;
  return {titel: (w && w.titel) || name, text, quelle: String(m.quelle || (w && w.quelle) || ""), wiki: w ? m.skill : null, stichwort};
};
