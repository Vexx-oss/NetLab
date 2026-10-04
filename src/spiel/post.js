"use strict";
/* ---------- Kundenpost: Nachrichten ohne Auftrag (Kunden als Personen, Konzept § 3.3) ----------
   Ein bisschen Geschichte zwischen den Tickets – nur aus Bausteinen, die es schon gibt
   (DATEN.kunden[…].saetze.lob, .beschreibung, .ansprechpartner), keine neuen Fachinhalte:
     - Lob vom Kunden nach dem 2. und 5. abgenommenen Ticket bei ihm (Spiel.POST_LOB_NACH),
     - Notiz vom Senior, sobald ein neuer Kunde dazukommt (seine Stufe erreicht und genug Ruf; ab Stufe 2).
   Nachrichten zählen nicht als offene Arbeit; ungelesene erscheinen im Zähler des Postfachs.
   Spiel.post.liste() · .ungelesen() · .gelesen(id) · .ablegen(id) · .pruefen() → neu hinzugekommene */
Spiel.post = {};
Spiel.POST_LOB_NACH = [2, 5];
Spiel.POST_MAX = 30;

Spiel.post.daten = function(st = Spiel.st){
  if (!st.post || typeof st.post !== "object" || Array.isArray(st.post)) st.post = {};
  const d = st.post;
  if (!Array.isArray(d.liste)) d.liste = [];
  d.liste = d.liste.filter(n => n && n.id && n.text);
  if (!d.schon || typeof d.schon !== "object") d.schon = {};        /* Auslöser, die schon eine Nachricht erzeugt haben */
  return d;
};
Spiel.ergaenzer.post = st => { Spiel.post.daten(st); };

Spiel.post.liste = function(){
  return Spiel.post.daten().liste.filter(n => !n.abgelegt).slice()
    .sort((a, b) => (!!a.gelesen - !!b.gelesen) || (b.t - a.t));
};
Spiel.post.ungelesen = () => Spiel.post.liste().filter(n => !n.gelesen).length;
Spiel.post.von = id => Spiel.post.daten().liste.find(n => n.id === id) || null;
Spiel.post.gelesen = function(id){
  const n = Spiel.post.von(id); if (!n || n.gelesen) return;
  n.gelesen = true; Spiel.geaendert("post-gelesen");
};
Spiel.post.ablegen = function(id){
  const n = Spiel.post.von(id); if (!n) return;
  n.abgelegt = true; n.gelesen = true; Spiel.geaendert("post-abgelegt");
};

/* Neue Nachrichten anlegen, wenn ihr Auslöser eingetreten ist (jeder Auslöser genau einmal) */
Spiel.post.pruefen = function(){
  if (Spiel._trocken || !Spiel._st) return [];
  const st = Spiel.st, d = Spiel.post.daten(), neu = [];
  const anlegen = (schluessel, n) => {
    d.schon[schluessel] = true;
    const x = Object.assign({id: "post-" + schluessel, t: jetzt(), gelesen: false}, n);
    d.liste.push(x); neu.push(x);
  };
  /* Lob nach dem 2. und 5. Ticket je Kunde (gezählt an den Sternen, die der Kunde vergeben hat) */
  for (const [id, stand] of Object.entries(st.kunden || {})) {
    const n = Array.isArray(stand && stand.sterne) ? stand.sterne.length : 0;
    const lob = (((DATEN.kunden || {})[id] || {}).saetze || {}).lob || [];
    Spiel.POST_LOB_NACH.forEach((schwelle, i) => {
      const s = `lob-${id}-${schwelle}`;
      if (n < schwelle || d.schon[s]) return;
      if (!lob.length) { d.schon[s] = true; return; }
      anlegen(s, {kunde: id, art: "lob", text: lob[i % lob.length]});
    });
  }
  /* Neuer Kunde (ab Stufe 2), sobald er sich meldet: kurze Notiz vom Senior aus den Kundendaten */
  for (const id of Spiel.karriere.kundenIds()) {
    const k = Spiel.karriere.kunde(id), s = `neu-${id}`;
    if (d.schon[s] || (k.stufe || 1) < 2 || (k.stufe || 1) > st.stufe || !Spiel.karriere.kundeOffen(id)) continue;
    const roh = (DATEN.kunden || {})[id] || {}, ap = roh.ansprechpartner || {};
    const teile = [`Neuer Kunde: ${k.name}${roh.branche ? " (" + roh.branche + ")" : ""}.`];
    if (ap.name) teile.push(`Ansprechpartner: ${ap.name}${ap.rolle ? ", " + ap.rolle : ""}.`);
    if (roh.beschreibung) teile.push(roh.beschreibung);
    if (roh.ton) teile.push("Gut zu wissen: " + roh.ton);
    anlegen(s, {kunde: id, art: "senior", text: teile.join("\n\n")});
  }
  if (d.liste.length > Spiel.POST_MAX) {
    const weg = d.liste.filter(n => n.abgelegt || n.gelesen).sort((a, b) => a.t - b.t);
    while (d.liste.length > Spiel.POST_MAX && weg.length) { const w = weg.shift(); d.liste.splice(d.liste.indexOf(w), 1); }
  }
  if (neu.length) Spiel.speichern();
  return neu;
};
