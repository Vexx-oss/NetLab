"use strict";
/* ---------- Die erste Stunde (Design – Spielspaß 2.0, § 20 F3; Architektur § 9.8) ----------
   Statt Zufall eine gestaltete Folge der ersten sechs Aufträge – Abwechslung beginnt dort, wo der Spieler entscheidet,
   ob ihm das Spiel gefällt: Kabel (Einstieg) · Störung · Hotline (das Telefon klingelt) · Fernwartung · erste Wahl
   „Provisorium oder sauber?“ · Weiterempfehlung (erstes Ereignis, harmlos) mit einem Plan-Audit. Danach mischt der Mischer.
   Im Postfach liegen immer die nächsten ZWEI offenen Schritte – die Reihenfolge bleibt eine Wahl. Die Weiterempfehlung
   kommt, sobald sie einer der nächsten zwei Schritte ist (nach dem vierten Abschluss). Zufällige Ereignisse schweigen bis
   dahin: Das erste Ereignis soll ein harmloses sein.
   st.ersteStunde = {fertig, ereignis} – nur ein NEUER Spielstand beginnt mit fertig:false (Spiel.ergaenzer); fehlt das
   Feld (alter Spielstand, Tests mit leererStand), gilt die erste Stunde als vorbei.
   Instanzen der Folge tragen inst.kuratiert = Schrittnummer (Postfach-Reihenfolge) und die Hotline inst.klingelt = true. */
Spiel.ERSTE_STUNDE = [
  {id: "kabel", ticket: "salon-01"},
  {id: "stoerung", ticket: "salon-02"},
  {id: "hotline", ticket: "salon-hotline", klingelt: true},
  {id: "fernwartung", form: "forensik", opts: {kunde: "salon"}},
  {id: "variante", ticket: "salon-05"},
  {id: "empfehlung", form: "audit", ereignis: "weiterempfehlung", opts: {kunde: "baeckerei"}},
];

Spiel.ersteStunde = (() => {
  const VORBEI = {fertig: true, ereignis: true};
  const daten = (st = Spiel.st) => st.ersteStunde && typeof st.ersteStunde === "object" ? st.ersteStunde : VORBEI;
  const aktiv = (st = Spiel.st) => !daten(st).fertig;
  /* Ein Schritt ist erledigt, wenn sein Auftrag (bzw. ein Auftrag seiner Form) abgeschlossen ist */
  const zaehlt = e => e && e.quelle !== "pruefung" && e.quelle !== "raetsel";
  const erledigt = (s, st = Spiel.st) => (st.erledigt || []).some(e => zaehlt(e) && (s.ticket ? e.id === s.ticket : e.form === s.form));
  const imPostfach = (s, st = Spiel.st) => (st.postfach || []).find(i => i.kuratiert === Spiel.ERSTE_STUNDE.indexOf(s) + 1 || (s.ticket && i.ticketId === s.ticket)) || null;
  const offen = (st = Spiel.st) => Spiel.ERSTE_STUNDE.filter(s => !erledigt(s, st));
  let wartend = null;                                       /* Ereignis für die Oberfläche (Karte nach dem Ergebnis) */

  function anlegen(s){
    const nr = Spiel.ERSTE_STUNDE.indexOf(s) + 1, niveau = Spiel.einst.wahl === "auto" ? undefined : Spiel.einst.wahl;
    let inst = null;
    if (s.ereignis) {
      const e = Spiel.ereignisse.ausloesen(s.ereignis, {form: s.form, kunde: s.opts && s.opts.kunde, stufe: niveau, erzwingen: true});
      if (!e || !e.iid) return null;
      inst = Spiel.instanz(e.iid);
      daten().ereignis = true;
      wartend = e;
    } else if (s.ticket) inst = Spiel.instanzErstellen({ticketId: s.ticket, quelle: "postfach"});
    else inst = Spiel.instanzErstellen({gen: {form: s.form, seed: Spiel.neuerSeed(s.form), opts: Object.assign({stufe: niveau}, s.opts)}, quelle: "generiert"});
    if (!inst) return null;
    inst.kuratiert = nr;
    inst.kuratiertId = s.id;
    if (s.klingelt) {                                       /* die Hotline kommt als Anruf: Karte „Das Telefon klingelt“ */
      inst.klingelt = true;
      const k = Spiel.kundenDaten(inst.kunde || Spiel.defVon(inst).kunde), ap = (k.ansprechpartner || {}).name || k.name;
      wartend = {id: "anruf", sym: "☎", titel: "Das Telefon klingelt", aktion: "abheben", iid: inst.iid, text: `${ap} (${k.name}) ruft an.`};
    }
    return inst;
  }

  /* Postfach während der ersten Stunde: die nächsten zwei offenen Schritte bereitlegen (statt Mischer) */
  function auffuellen(){
    const st = Spiel.st, d = daten(st), neu = [];
    if (d.fertig) return neu;
    /* Fehlen die Aufträge der Folge (andere Daten, Testtickets), gilt sie als vorbei – der Mischer übernimmt wie bisher */
    if (!Spiel.ERSTE_STUNDE.every(s => !s.ticket || Spiel.ticketDef(s.ticket))) { d.fertig = true; return neu; }
    const rest = offen(st);
    if (!rest.length) { d.fertig = true; Spiel.speichern(); return neu; }
    for (const s of rest.slice(0, 2)) {
      const da = imPostfach(s, st);
      if (da) { if (!da.kuratiert) { da.kuratiert = Spiel.ERSTE_STUNDE.indexOf(s) + 1; da.kuratiertId = s.id; } continue; }
      try { const i = anlegen(s); if (i) neu.push(i); }
      catch (e) { typeof console !== "undefined" && console.error("Erste Stunde", s.id, e); }
    }
    Spiel.speichern();
    return neu;
  }

  return {
    daten, aktiv, offen, auffuellen, erledigt,
    /* Zufällige Ereignisse ruhen, bis das erste (kuratierte) Ereignis gekommen ist */
    ruhig: () => aktiv() && !daten().ereignis,
    /* Ereignis der Folge einmal abholen (die Oberfläche zeigt es als Karte) */
    abholen(){ const e = wartend; wartend = null; return e; },
    /* Für die Anzeige: welcher Schritt, wie viele geschafft */
    stand(){ const r = offen(); return {aktiv: aktiv(), geschafft: Spiel.ERSTE_STUNDE.length - r.length, gesamt: Spiel.ERSTE_STUNDE.length, naechster: r[0] ? r[0].id : null}; },
    /* Baustein F: die Anweisungszeile der ersten Stunde nach Stufe. Der Einstiegsschritt (Kabel,
       Ticket salon-01) bekommt sie – als WEG, nicht als Lösung; jeder andere Schritt nicht.
       Ohne Argument gilt der erste offene Schritt; azubi/azubi-plus bekommen Text, geselle/meister null. */
    anweisung(schritt){
      const s = typeof schritt === "string" ? Spiel.ERSTE_STUNDE.find(x => x.id === schritt) : schritt;
      const e = s || offen()[0] || null;
      return e && e.ticket ? Spiel.einstieg.anweisung({id: e.ticket}) : null;
    },
  };
})();

/* Neuer Spielstand: die erste Stunde beginnt. Alter Stand mit erledigten Aufträgen: vorbei (nichts ändert sich für ihn). */
Spiel.ergaenzer.ersteStunde = st => {
  if (!st.ersteStunde || typeof st.ersteStunde !== "object") st.ersteStunde = {fertig: (st.erledigt || []).length > 0, ereignis: false};
};

/* ---------- Sanftes Onboarding beim ersten Start (Bau P7) ----------
   Der Nutzer: „Man wird jetzt ziemlich reingeworfen, ohne Introduction oder was zu tun ist.“
   Drei Stationen, jede genau einmal, jede überspringbar, keine Textwand (je Karte höchstens zwei Sätze):
     1. Begrüßungskarte  – was das Programm ist, welche Rolle der Spieler hat, zwei Wege
     2. Anweisung        – EINE Zeile am ersten Auftrag, nennt den Weg (Werkzeug), nicht die Lösung
     3. Abschluss        – nach dem ersten bestandenen Auftrag: was gelernt wurde und wie es hier läuft
   (Eine vierte Station „Bedienelemente sanfter“ gibt es bewusst nicht: Inspektor, Simulation und
   Terminal erscheinen schon heute erst, wenn sie Inhalt haben – `ui/editor.js:142` (`dockOffen`,
   `Z.inspWartet`) und `:151`. Etwas zu dämpfen, was noch gar nicht da ist, wäre eine zweite
   Baustelle ohne Wirkung; unerreichbar machen darf ohnehin nichts werden.)

   Zustand: `st.einstieg` (bleibt, wie es ist) bekommt zwei Felder:
     `begruessung` = "auftrag" | "umsehen"  – die Wahl in Station 1, gesetzt beim Klick
     `abschluss`   = true                   – Station 3 wurde gezeigt
   Damit gilt: Ein ALTER Spielstand hat `fertig: true` (oder erledigte Aufträge) und bekommt NICHTS
   davon zu sehen — die Begrüßung verlangt `fertig === false` UND keine erledigten Aufträge, der
   Abschluss verlangt zusätzlich, dass genau dieser Stand die Begrüßung gesehen hat. */
Spiel.EINSTIEG_TEXTE = {
  /* 135 Zeichen, zwei Sätze (der Test prüft beides). */
  BEGRUESSUNG: "Willkommen im Netzwerk-Labor! Als neuer FISI in dieser IT-Werkstatt hilfst du Kunden bei Netzproblemen – dein erster Auftrag liegt bereit.",
  WEG_AUFTRAG: "Zeig mir den ersten Auftrag",
  WEG_UMSEHEN: "Erst umsehen",
  /* Nennt den WEG, nicht die LÖSUNG: Das Ziel von salon-01 ist „Die Kasse druckt auf dem Drucker“
     (Ziel kasse → drucker). Genau dieses Paar steht hier NICHT – welches Gerät seinen Link
     verloren hat, sieht der Spieler selbst; der Switch ist der offensichtliche Verteiler in der
     Zeichnung und hilft als Richtung, ohne die Diagnose abzunehmen. */
  HINWEIS: "Wähle das Kabel-Werkzeug (K) und zieh vom Gerät ohne Link ein Kabel zum Switch.",
  /* Baustein F: derselbe Weg, knapper – für azubi-plus (Vertrag § 2: „ja, knapper Text").
     Weiterhin der WEG, nicht die LÖSUNG: kein Gerätepaar, kein Ziel. */
  HINWEIS_KNAPP: "Kabel-Werkzeug (K): das Gerät ohne Link mit dem Switch verbinden.",
  /* Baustein F: die Frage über der Stufenwahl in der Begrüßungskarte (zwei Sätze, wie die übrigen Karten). */
  STUFE_FRAGE: "Wie viel Hilfe darf es sein? Umstellen geht jederzeit in den Einstellungen.",
  SCHLUSS_LERNEN: "Das war Schicht 1: Ohne Kabel kein Link – deshalb fängt jede Fehlersuche beim Stecker an.",
  SCHLUSS_WEG: "Aufträge kommen ins Postfach, gelöst wird im Labor, danach prüft der Kunde in der Abnahme.",
};

/* ---------- Baustein F: der Bildungsstand im Einstieg (Vertrag § 1, § 2) ----------
   Die vier Stufen stehen dort zur Wahl, wo der Mensch sie zuerst sieht: in der Begrüßungskarte
   (Station 1; gezeichnet wird sie von src/ui/spiel.js, die Wahl hängt src/ui/start.js an).
   Je Stufe EIN Satz, was sich ändert – kein Katalog, keine Zahlenwand.
   Die Namen kommen aus Spiel.STUFE (Baustein A) und werden nur gelesen, wenn es ihn gibt;
   fehlt er, gelten die vier festen Namen hier. Nichts hierin wirft (Vertrag § 3, Regel 1). */
Spiel.EINSTIEG_STUFEN = [
  {id: "azubi",      rang: 1, kurz: "Azubi",   name: "Azubi (1. Lehrjahr)",            satz: "Vorschläge, Befehlsgerüst und Werkzeugleiter sind immer sichtbar – sechs Hilfen je Auftrag sind frei."},
  {id: "azubi-plus", rang: 2, kurz: "Azubi+",  name: "Azubi (fortgeschritten)",        satz: "Vorschläge und Gerüst bleiben, die Texte werden knapper – vier Hilfen je Auftrag sind frei."},
  {id: "geselle",    rang: 3, kurz: "Geselle", name: "Geselle / Prüfungsvorbereitung", satz: "Hilfen erscheinen erst nach einem Fehler – zwei Hilfen je Auftrag sind frei."},
  {id: "meister",    rang: 4, kurz: "Meister", name: "Meister / Profi",                satz: "Keine ungefragte Hilfe und keine Vorschläge – du arbeitest ohne Netz."},
];
/* Der Bildungsstand, defensiv gelesen: über Spiel.stufe (Baustein A), sonst aus einst.stufe,
   sonst „azubi“. Kein Wurf, wenn beides fehlt oder Unsinn dasteht. */
Spiel.einstiegStufe = function(){
  try {
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.id === "function") {
      const id = Spiel.stufe.id();
      if (Spiel.EINSTIEG_STUFEN.some(s => s.id === id)) return id;
    }
  } catch (e) { /* Baustein A fehlt oder wirft – der Rückfall unten gilt */ }
  const roh = Spiel.einst ? Spiel.einst.stufe : null;
  return Spiel.EINSTIEG_STUFEN.some(s => s.id === roh) ? roh : "azubi";
};
/* Was eine Stufe an Hilfe bedeutet: für azubi ausführlich, für azubi-plus knapp, sonst keine
   ungefragte Anweisung. Die Anweisungszeile der ersten Stunde (Station 2) hängt daran. */
Spiel.EINSTIEG_ANWEISUNG = {azubi: "ausfuehrlich", "azubi-plus": "knapp", geselle: "keine", meister: "keine"};

Spiel.einstieg = (() => {
  /* Fehlt `einstieg` ganz (sehr alter Stand, Teststand), gilt das Onboarding als vorbei. */
  const daten = (st = Spiel.st) => (st && st.einstieg && typeof st.einstieg === "object") ? st.einstieg : {fertig: true};
  const frisch = (st = Spiel.st) => !daten(st).fertig && !((st && Array.isArray(st.erledigt)) ? st.erledigt.length : 0);
  const begruessungNoetig = (st = Spiel.st) => frisch(st) && !daten(st).begruessung;
  /* Die Wahl fällt genau einmal; ein zweiter Aufruf ändert nichts mehr. */
  function waehlen(weg, st = Spiel.st){
    const e = daten(st);
    if (!begruessungNoetig(st)) return e.begruessung || null;
    e.begruessung = weg === "umsehen" ? "umsehen" : "auftrag";
    Spiel.speichern();
    Spiel.melden("einstieg", {schritt: "begruessung", weg: e.begruessung});
    return e.begruessung;
  }
  /* ---- Baustein F: Bildungsstand (nur lesen und über Spiel.stufe.setzen schreiben) ---- */
  const alsId = id => (Spiel.EINSTIEG_STUFEN.some(s => s.id === id) ? id : null);
  /* Die vier Stufen mit je einem Satz; die Namen kommen aus Spiel.STUFE, wenn es sie gibt. */
  const stufen = () => {
    let namen = null;
    try { if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.alle === "function") namen = Spiel.stufe.alle(); }
    catch (e) { namen = null; }
    return Spiel.EINSTIEG_STUFEN.map(s => {
      const d = Array.isArray(namen) ? namen.find(x => x && x.id === s.id) : null;
      return d ? Object.assign({}, s, {name: d.name || s.name, kurz: d.kurz || s.kurz, rang: d.rang || s.rang}) : Object.assign({}, s);
    });
  };
  /* Ein Satz zur Stufe – ohne Argument zur eingestellten; unbekannte ID zählt als „azubi“. */
  const stufeSatz = id => (Spiel.EINSTIEG_STUFEN.find(s => s.id === (alsId(id) || Spiel.einstiegStufe())) || Spiel.EINSTIEG_STUFEN[0]).satz;
  /* Die Wahl steht auf der Begrüßungskarte und damit genau so lange wie diese (Station 1). */
  const stufeNoetig = (st = Spiel.st) => begruessungNoetig(st);
  /* Die Wahl aus der Begrüßung: schreibt über Spiel.stufe.setzen (Vertrag § 3, Regel 3) und zieht
     damit auch die Erklärtiefe nach. Fehlt Baustein A, schreibt der offizielle Setter des Spiels;
     beide Wege sind defensiv, keiner wirft. Direkt in den Store schreibt niemand. */
  function stufeWaehlen(id){
    const gewaehlt = alsId(id) || "azubi";
    let gesetzt = gewaehlt;
    try {
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.setzen === "function") {
        const r = Spiel.stufe.setzen(gewaehlt);
        if (r && r.id) gesetzt = r.id;
      } else if (typeof Spiel.einstSetzen === "function") {
        Spiel.einstSetzen("stufe", gewaehlt);
      }
    } catch (e) { typeof console !== "undefined" && console.warn("Bildungsstand", e); }
    Spiel.melden("einstieg", {schritt: "stufe", stufe: gesetzt});
    return gesetzt;
  }
  /* Station 2: die Anweisungszeile der ersten Stunde – nur für den Einstiegsauftrag und nur,
     wenn die Stufe eine ungefragte Anweisung will. Sie nennt den WEG, nie die Lösung. */
  function anweisung(def){
    if (!def || def.id !== Spiel.EINSTIEG_TICKET) return null;
    const id = Spiel.einstiegStufe();
    const art = Spiel.EINSTIEG_ANWEISUNG[id];
    if (art !== "ausfuehrlich" && art !== "knapp") return null;
    return {stufe: id, text: art === "knapp" ? Spiel.EINSTIEG_TEXTE.HINWEIS_KNAPP : Spiel.EINSTIEG_TEXTE.HINWEIS};
  }
  const hinweisFuer = def => { const a = anweisung(def); return a ? a.text : null; };
  const abschlussNoetig = (st = Spiel.st) => { const e = daten(st); return !!e.begruessung && !!e.fertig && !e.abschluss; };
  function abschlussZeigen(st = Spiel.st){
    if (!abschlussNoetig(st)) return false;
    daten(st).abschluss = true;
    Spiel.speichern();
    Spiel.melden("einstieg", {schritt: "abschluss"});
    return true;
  }
  return {daten, begruessungNoetig, waehlen, hinweisFuer, abschlussNoetig, abschlussZeigen,
    stufen, stufeSatz, stufeNoetig, stufeWaehlen, anweisung};
})();
