"use strict";
/* ---------- Mini-Tickets für die Leiste (Konzept § 3.2 „Mini“, § 3.4) ----------
   Spiel.mini.naechstes() → Mini (Auswahl: Unterrichtsthema → fällige Fertigkeiten → häufige Fehler → schwächste der Stufe)
   Spiel.mini.antworten(id, antwort) → {richtig, erklaerung, lohn, loesung}   (Lernmotor + kleiner Lohn)
   Spiel.mini.fuerSkill(skill), Spiel.mini.setzen(id)   (Training aus Lernstand und Playbooks)
   Antwortformen: wahl/vorhersage = Index · reihenfolge = Indexliste · zuordnen = Paare [links, rechts]. */
Spiel.mini = {};
/* SPROSSEN = Denkhilfen je Frage nach Bildungsstand (Vertrag § 2) · HILFE_KONTO = freie Hilfen je Mini-Runde (§ 2.1).
   Beide Zahlen stehen im Vertrag. Liegt Spiel.HILFE_KONTO aus Baustein A vor, hat es Vorrang (miniKonto). */
Spiel.MINI = {LOHN: {E: 2, AP1: 3, AP2: 5}, SPERRE: 25,
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
  return s;
};
Spiel.mini.alle = () => (DATEN.mini || []).filter(m => m && m.id && m.skill);
Spiel.mini.von = id => Spiel.mini.alle().find(m => m.id === id) || null;

/* passend zum Niveau: E-Spieler bekommen E und AP1, AP2-Spieler alles */
Spiel.mini.passtNiveau = function(m){
  const n = typeof Spiel.karriere !== "undefined" && Spiel.karriere.niveau ? Spiel.karriere.niveau() : "E";
  if (n === "E") return m.stufe !== "AP2";
  return true;
};
Spiel.mini.fuerSkill = function(skill, {ohne = []} = {}){
  const s = Spiel.mini.stand();
  const kand = Spiel.mini.alle().filter(m => m.skill === skill && !ohne.includes(m.id));
  if (!kand.length) return null;
  const frisch = kand.filter(m => !s.zuletzt.includes(m.id) && Spiel.mini.passtNiveau(m));
  const liste = frisch.length ? frisch : kand;
  return liste[Zufall(skill + ":" + s.richtig + ":" + s.falsch + ":" + heute()).zahl(liste.length)];
};
Spiel.mini.setzen = function(id){ Spiel.mini.stand().aktuell = id; Spiel.speichern(); };

Spiel.mini.naechstes = function(){
  const s = Spiel.mini.stand();
  if (s.aktuell && Spiel.mini.von(s.aktuell)) return Spiel.mini.von(s.aktuell);
  const st = Spiel.st;
  const freigegeben = (DATEN.skills || []).filter(x => (x.stufe || 1) <= Math.max(1, st.stufe)).map(x => x.id);
  const vorhanden = new Set(Spiel.mini.alle().map(m => m.skill));
  const kandidaten = [];
  const u = Spiel.einst && Spiel.einst.unterricht;
  if (u) kandidaten.push(u);
  if (typeof L !== "undefined") {
    kandidaten.push(...L.faelligeIds(id => id.startsWith("lab.")));
    kandidaten.push(...L.haeufigeFehler(14).map(f => f.id).filter(id => String(id).startsWith("lab.")));
    kandidaten.push(...freigegeben.slice().sort((a, b) => L.box(a) - L.box(b)));
  } else kandidaten.push(...freigegeben);
  for (const skill of kandidaten) {
    if (!vorhanden.has(skill)) continue;
    const m = Spiel.mini.fuerSkill(skill);
    if (m && !s.zuletzt.slice(-6).includes(m.id)) { s.aktuell = m.id; Spiel.speichern(); return m; }
  }
  const rest = Spiel.mini.alle().filter(m => !s.zuletzt.includes(m.id));
  const m = rest.length ? rest[Zufall("rest:" + s.richtig + s.falsch).zahl(rest.length)] : Spiel.mini.alle()[0] || null;
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
