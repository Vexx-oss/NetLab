"use strict";
/* ---------- Hub „Heute“: Ankommen, ein nächster Schritt, Feierabend mit Ausblick (Design – Spielspaß 2.0, Hebel 4) ----------
   Headless: was die Startseite zeigt. Die Oberfläche (ui/hub.js) zeichnet nur.
   Serie mit Urlaubstagen: Je Kalenderwoche dürfen zwei Tage fehlen, ohne dass die Serie reißt – und reißt sie doch,
   heißt es „Willkommen zurück“, nie „Serie verloren“ (R7: keine Serien-Schuld). */
Spiel.hub = {};
Spiel.HUB = {URLAUB_PRO_WOCHE: 2, AUFWAERMEN: 3};

/* Montag der Kalenderwoche eines Tages („2026-10-05“ → „2026-10-05“, Sonntag „2026-10-11“ → „2026-10-05“) */
Spiel.hub.wochenstart = function(tag){
  const d = new Date(tag + "T12:00:00Z");
  return plusTage(tag, -((d.getUTCDay() + 6) % 7));
};
/* Aktive Tage: Lernmotor-Übungen, erledigte Aufträge, gelöste Tagesrätsel */
Spiel.hub.aktiveTage = function(){
  const s = new Set();
  if (typeof L !== "undefined") for (const [t, n] of Object.entries(L.st.tage || {})) if (n > 0) s.add(t);
  for (const e of Spiel.st.erledigt || []) if (e && e.tag) s.add(e.tag);
  for (const k of Object.keys(Spiel.st.tagesraetsel || {})) if (/^\d{4}-\d\d-\d\d$/.test(k)) s.add(k);
  return s;
};
/* Serie rückwärts zählen: aktive Tage zählen, fehlende Tage verbrauchen Urlaub ihrer Woche; der heutige Tag
   zählt nur, wenn er schon aktiv ist (er ist ja noch nicht vorbei). */
Spiel.hub.serie = function(tage, tag = heute()){
  tage = tage instanceof Set ? tage : new Set(tage || []);
  const urlaub = {};
  let n = 0, d = tag;
  if (tage.has(d)) n++;
  for (let i = 0; i < 800; i++) {
    d = plusTage(d, -1);
    if (tage.has(d)) { n++; continue; }
    const w = Spiel.hub.wochenstart(d);
    urlaub[w] = (urlaub[w] || 0) + 1;
    if (urlaub[w] > Spiel.HUB.URLAUB_PRO_WOCHE) break;
  }
  if (!n) return {tage: 0, urlaub: 0, frei: Spiel.HUB.URLAUB_PRO_WOCHE};
  const diese = Math.min(Spiel.HUB.URLAUB_PRO_WOCHE, urlaub[Spiel.hub.wochenstart(tag)] || 0);
  return {tage: n, urlaub: diese, frei: Spiel.HUB.URLAUB_PRO_WOCHE - diese};
};
/* Zurück nach einer Pause (zwei und mehr Tage ohne Aktivität)? */
Spiel.hub.zurueck = function(tage, tag = heute()){
  if (tage.has(tag)) return false;
  const frueher = [...tage].filter(t => t < tag).sort();
  return frueher.length > 0 && tageZwischen(frueher[frueher.length - 1], tag) >= 2;
};

/* Der nächste Auftrag: angefangener zuerst, sonst der oberste im Postfach (Frist, ungelesen, Eingang) */
Spiel.hub.naechster = function(){
  const aktiv = Spiel.aktiveInstanz && Spiel.aktiveInstanz();
  const inst = aktiv && aktiv.quelle !== "raetsel" && aktiv.quelle !== "pruefung" ? aktiv : Spiel.postfach()[0] || null;
  if (!inst) return {art: "leer"};
  const def = Spiel.defVon(inst), k = Spiel.kundenDaten(inst.kunde || def.kunde);
  return {art: inst === aktiv || inst.geoeffnet ? "weiter" : "neu", iid: inst.iid, titel: def.titel,
    kunde: k.name, kontakt: (k.ansprechpartner || {}).name || k.name, symbol: k.symbol || "✉", farbe: k.farbe || null,
    minuten: Spiel.minuten(def), euro: (def.lohn || {}).euro || 0, niveau: Spiel.niveauFuer(def), form: def.art};
};

/* Ein Satz für morgen (offener Faden): Kundenauftrag im Postfach → fällige Fertigkeit → nächstes Tagesrätsel */
Spiel.hub.ausblick = function(){
  const n = Spiel.hub.naechster();
  if (n.art !== "leer") return `Morgen wartet ${n.kontakt}${n.kontakt !== n.kunde ? ` (${n.kunde})` : ""}: „${n.titel}“`;
  const b = Spiel.tag.bilanz();
  if (b.morgenFaellig.length) return `Morgen fällig: ${Spiel.skill(b.morgenFaellig[0]).name}`;
  return `Morgen: Tagesrätsel #${Spiel.raetsel.nummer(plusTage(heute(), 1))}`;
};

Spiel.hub.aufgewaermt = function(){
  const d = Spiel.tag.daten();
  d.aufwaermen = (d.aufwaermen || 0) + 1;
  Spiel.speichern();
  return d.aufwaermen;
};

Spiel.hub.stand = function(){
  const tag = heute(), tage = Spiel.hub.aktiveTage(), t = Spiel.tag.heute();
  const serie = Object.assign(Spiel.hub.serie(tage, tag), {zurueck: Spiel.hub.zurueck(tage, tag)});
  const r = Spiel.raetsel.heute();
  return {
    tag, serie,
    naechster: Spiel.hub.naechster(),
    aufwaermen: {ziel: Spiel.HUB.AUFWAERMEN, erledigt: Spiel.tag.daten().aufwaermen || 0},
    raetsel: {nr: r.nr, niveau: r.niveau, laeuft: !!r.inst, geloest: !!r.ergebnis, sterne: r.ergebnis ? r.ergebnis.sterne : null, serie: r.serie},
    post: {ungelesen: Spiel.post ? Spiel.post.ungelesen() : 0},
    dex: Spiel.dex.zaehlen(),
    tagesziel: {erledigt: t.erledigtHeute, ziel: t.ziel},
    feierabend: t.fertig ? {bilanz: Spiel.tag.bilanz(), ausblick: Spiel.hub.ausblick()} : null,
  };
};
