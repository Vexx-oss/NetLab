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
  SCHLUSS_LERNEN: "Das war Schicht 1: Ohne Kabel kein Link – deshalb fängt jede Fehlersuche beim Stecker an.",
  SCHLUSS_WEG: "Aufträge kommen ins Postfach, gelöst wird im Labor, danach prüft der Kunde in der Abnahme.",
};

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
  /* Station 2: die Anweisung gilt nur für den Einstiegsauftrag. */
  const hinweisFuer = def => (def && def.id === Spiel.EINSTIEG_TICKET) ? Spiel.EINSTIEG_TEXTE.HINWEIS : null;
  const abschlussNoetig = (st = Spiel.st) => { const e = daten(st); return !!e.begruessung && !!e.fertig && !e.abschluss; };
  function abschlussZeigen(st = Spiel.st){
    if (!abschlussNoetig(st)) return false;
    daten(st).abschluss = true;
    Spiel.speichern();
    Spiel.melden("einstieg", {schritt: "abschluss"});
    return true;
  }
  return {daten, begruessungNoetig, waehlen, hinweisFuer, abschlussNoetig, abschlussZeigen};
})();
