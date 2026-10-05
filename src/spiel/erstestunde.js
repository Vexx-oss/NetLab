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
