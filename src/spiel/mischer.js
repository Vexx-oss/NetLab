"use strict";
/* ---------- Mischer: Postfach als Wahl (Hebel 9; Plan – Ausbau 1.2, E2 „Ticket-Mischer“; Architektur § 9.6) ----------
   Aus Kandidaten – je Form der nächste Story-Auftrag und die generierten Formen je Kunde – wählt der Mischer die neuen
   Angebote: zuerst neue Form UND neuer Kunde, dann neue Form, dann neuer Kunde. Formen, die lange nicht dran waren, wiegen
   mehr. Waren die letzten zwei Abschlüsse dieselbe Form, ist sie gesperrt: nie dieselbe Form mehr als zweimal in Folge.
   Liegt kein Story-Auftrag im Postfach, ist der nächste (nach Reihe, nicht gesperrt) immer dabei – die Geschichte stockt nie.
   Spiel.mischer.waehlen ist rein (kein Ticketbau) – so lässt sich die Vielfalt an tausend Postfächern prüfen.

   DOPPELTER INHALT IM POSTFACH (task-16, nachgemessen und behoben). Für ein generiertes Angebot ist
   (Form, Kunde) der Inhalt; die Zahlen darin sind ohnehin neu (Spiel.neuerSeed). Vorher stand die
   Dopplung nur als Vorliebe in den drei Stufen – bei kleinem Topf nahm die vierte Stufe („irgendetwas“)
   ein Angebot, das schon offen lag. Gemessen über den echten Weg (Spiel.postfachAuffuellen, 4
   Karriere-Stufen × 10 Verläufe, je 30 Runden): vorher 21 von 1200 Auffüll-Runden mit doppeltem Inhalt,
   nachher 0. Die harte Sperre unten gilt nur für generierte Kandidaten; Story-Aufträge sind über ihre
   ticketId schon ausgeschlossen und dürfen die Geschichte nicht verstopfen. */
Spiel.mischer = {};
Spiel.mischer.gesperrt = verlauf => { const n = (verlauf || []).length; return n >= 2 && verlauf[n - 1] === verlauf[n - 2] ? verlauf[n - 1] : null; };

Spiel.mischer.waehlen = function({kandidaten, offen = [], verlauf = [], n = 1, z}){
  const sperre = Spiel.mischer.gesperrt(verlauf);
  const seit = form => { const i = verlauf.lastIndexOf(form); return i < 0 ? verlauf.length + 3 : verlauf.length - 1 - i; };
  const gewicht = k => (k.gewicht || 1) * (1 + Math.min(6, seit(k.form)));
  const gewaehlt = [];
  /* Harte Sperre gegen doppelten Inhalt: (Form, Kunde) liegt schon im Postfach → nicht in den Topf.
     Der Null-Trenner hält „a“ + „bc“ und „ab“ + „c“ auseinander; fehlt Form oder Kunde, greift die
     Sperre nicht (dann ist der Inhalt nicht bestimmbar). */
  const inhalt = k => (k && k.form != null && k.kunde != null) ? k.form + "\u0000" + k.kunde : null;
  const offenInhalt = new Set(offen.map(inhalt).filter(Boolean));
  const doppelt = k => !!k.gen && offenInhalt.has(inhalt(k));
  let pool = (kandidaten || []).filter(k => k.form !== sperre && !doppelt(k));
  if (n > 0 && !offen.some(o => o.story)) {
    const story = pool.filter(k => k.story).sort((a, b) => a.rang - b.rang)[0];
    if (story) { gewaehlt.push(story); pool = pool.filter(x => x.schluessel !== story.schluessel); }
  }
  for (let i = gewaehlt.length; i < n && pool.length; i++) {
    const formen = new Set([...offen.map(o => o.form), ...gewaehlt.map(g => g.form)]);
    const kunden = new Set([...offen.map(o => o.kunde), ...gewaehlt.map(g => g.kunde)]);
    const stufen = [k => !formen.has(k.form) && !kunden.has(k.kunde), k => !formen.has(k.form), k => !kunden.has(k.kunde), () => true];
    let auswahl = [];
    for (const f of stufen) { auswahl = pool.filter(f); if (auswahl.length) break; }
    const summe = auswahl.reduce((s, k) => s + gewicht(k), 0);
    let r = (z.zahl(1000000) / 1000000) * summe, k = auswahl[auswahl.length - 1];
    for (const x of auswahl) { r -= gewicht(x); if (r < 0) { k = x; break; } }
    gewaehlt.push(k);
    pool = pool.filter(x => x.schluessel !== k.schluessel);
  }
  return gewaehlt;
};

/* Kandidaten aus dem Spielstand: je Form der nächste ungelöste Story-Auftrag (Reihenfolge bleibt), dazu je freigeschaltetem
   Kunden die generierten Formen (ab Spiel.FORM_AB). Story wiegt dreifach, damit die Geschichte weitergeht. */
Spiel.mischer.kandidaten = function(st = Spiel.st){
  const imPostfach = new Set(st.postfach.map(i => i.ticketId));
  const liste = [], erste = {};
  for (const [rang, t] of Spiel.ticketReihe().entries()) {
    if ((t.karriere || 1) > st.stufe || Spiel.istErledigt(t.id) || imPostfach.has(t.id)) continue;
    const f = Spiel.formVon(t);
    if (erste[f]) continue;
    erste[f] = t;
    liste.push({form: f, kunde: t.kunde, gewicht: 3, schluessel: "t:" + t.id, ticketId: t.id, story: true, rang});
  }
  const empfohlen = id => !!(Spiel.kundenakte && Spiel.kundenakte.empfohlen(id, st) && Spiel.karriere.kundeOffen(id));    /* Vertrauen 3: eine Stufe früher */
  const kunden = Object.values(DATEN.kunden || {}).filter(k => ((k.stufe || 1) <= st.stufe || ((k.stufe || 1) <= st.stufe + 1 && empfohlen(k.id))) && Spiel.vorlagen._fuerKunde[k.id] && k.id !== "storage").map(k => k.id);
  for (const form of Object.keys(Spiel.formGeneratoren)) {
    if ((Spiel.FORM_AB[form] || 1) > st.stufe) continue;
    for (const kunde of kunden) liste.push({form, kunde, gewicht: 1, schluessel: `g:${form}:${kunde}`, gen: {form, opts: {kunde}}});
  }
  return liste;
};
