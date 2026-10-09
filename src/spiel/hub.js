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
/* Serie rückwärts zählen: aktive Tage zählen; ein fehlender Tag ist ein Urlaubstag seiner Woche, aber nur, wenn
   davor (rückwärts) wieder ein aktiver Tag kommt – er also eine Lücke in der Serie überbrückt. Fehltage vor dem
   Beginn der Serie verbrauchen nichts. Der heutige Tag zählt nur, wenn er schon aktiv ist (er ist ja noch nicht vorbei).
   → {tage, urlaub: überbrückte Fehltage dieser Woche, frei: davon noch übrig} */
Spiel.hub.serie = function(tage, tag = heute()){
  tage = tage instanceof Set ? tage : new Set(tage || []);
  const MAX = Spiel.HUB.URLAUB_PRO_WOCHE, genutzt = {}, offen = [];
  let n = 0, d = tag;
  if (tage.has(d)) n++;
  for (let i = 0; i < 800; i++) {
    d = plusTage(d, -1);
    if (tage.has(d)) { n++; for (const w of offen) genutzt[w] = (genutzt[w] || 0) + 1; offen.length = 0; continue; }
    const w = Spiel.hub.wochenstart(d);
    if ((genutzt[w] || 0) + offen.filter(x => x === w).length + 1 > MAX) break;
    offen.push(w);
  }
  if (!n) return {tage: 0, urlaub: 0, frei: MAX};
  const diese = genutzt[Spiel.hub.wochenstart(tag)] || 0;
  return {tage: n, urlaub: diese, frei: MAX - diese};
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
  const liste = Spiel.postfach();
  const angefangen = liste.filter(i => i.geoeffnet).sort((a, b) => b.geoeffnet - a.geoeffnet)[0] || null;   /* zuletzt angefangener */
  /* Die unsichtbaren Quellen bleiben draußen (Entscheidung task-30, begründet): training und klassenraum
     liegen seit E1 nicht mehr in Spiel.postfach(); die Kachel ist die sichtbare „was jetzt dran ist“-
     Fläche und darf keinen Auftrag als nächsten zeigen (samt Lohnversprechen), der nichts zahlt und im
     Postfach fehlt. pruefung und raetsel waren schon immer ausgenommen. */
  const inst = aktiv && aktiv.quelle !== "raetsel" && aktiv.quelle !== "pruefung" && aktiv.quelle !== "training" && aktiv.quelle !== "klassenraum" ? aktiv : angefangen || liste[0] || null;
  if (!inst) return {art: "leer"};
  const def = Spiel.defVon(inst), k = Spiel.kundenDaten(inst.kunde || def.kunde);
  return {art: inst === aktiv || inst.geoeffnet ? "weiter" : "neu", iid: inst.iid, titel: def.titel,
    kunde: k.name, kontakt: (k.ansprechpartner || {}).name || k.name, symbol: k.symbol || "✉", farbe: k.farbe || null,
    minuten: Spiel.minuten(def), euro: (def.lohn || {}).euro || 0, niveau: Spiel.niveauFuer(def), form: Spiel.formVon(def),
    klingelt: !!inst.klingelt && !inst.geoeffnet};
};

/* Die Wahl bleibt sichtbar (§ 20 F7): zwei weitere Aufträge aus dem Postfach neben der Hauptkarte (Titel kurz: Platzbudget) */
Spiel.hub.weitere = function(n = 2){
  const haupt = Spiel.hub.naechster();
  return Spiel.postfach().filter(i => i.iid !== haupt.iid).slice(0, n).map(i => {
    const def = Spiel.defVon(i), w = String(def.titel || "").split(/\s+/);
    return {iid: i.iid, titel: w.length > 3 ? w.slice(0, 3).join(" ") + " …" : def.titel, voll: def.titel, form: Spiel.formVon(def), klingelt: !!i.klingelt && !i.geoeffnet};
  });
};

/* Ein Satz für morgen – der offene Faden (Design § 20, F5): Folgeauftrag eines Provisoriums → Notfall → ein Kapitel, das nur
   noch eine saubere Arbeit entfernt ist → Kundenauftrag im Postfach → fällige Fertigkeit → nächstes Tagesrätsel */
Spiel.hub.ausblick = function(){
  const st = Spiel.st, wer = id => { const k = Spiel.kundenDaten(id); return (k.ansprechpartner || {}).name || k.name; };
  const s = (Spiel.varianten ? Spiel.varianten.schulden() : []).filter(x => !x.erledigt).sort((a, b) => a.faellig - b.faellig)[0];
  /* kurz – der Satz steht im Hub und zählt zum Platzbudget (≤ 40 Wörter); Einzelheiten stehen in Akte und Postfach */
  if (s) return s.folge && Spiel.instanz(s.folge) ? `Morgen wartet der Folgeauftrag von ${wer(s.kunde)} – diesmal sichern.`
    : `Morgen: Provisorium bei ${wer(s.kunde)} – meldet sich in ${Math.max(1, s.faellig - st.erledigt.length)} Aufträgen.`;
  const notfall = Spiel.postfach().find(i => i.quelle === "notfall");
  if (notfall) { const d = Spiel.defVon(notfall); return `Morgen zuerst: Notfall bei ${Spiel.kundenDaten(notfall.kunde || d.kunde).name}.`; }
  if (Spiel.kundenakte) for (const kunde of Object.keys(Spiel.kundenakte.alle())) {
    const v = Spiel.kundenakte.vertrauen(kunde), sw = Spiel.kundenakte.naechsteSchwelle(kunde);
    const kap = Spiel.kundenakte.kapitel(kunde).find(x => !x.frei && x.ab === v + 1);
    if (kap && sw && sw.bis - sw.punkte <= 1) return `Morgen: Ein sauberer Auftrag bei ${wer(kunde)}, dann „${kap.titel}“.`;
  }
  const n = Spiel.hub.naechster();
  if (n.art !== "leer") return `Morgen wartet ${n.kontakt}: „${n.titel}“`;
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
    weitere: Spiel.hub.weitere(),                                     /* § 20 F7: die Wahl aus dem Postfach, als kleine Zeilen */
    woche: Spiel.woche ? Spiel.woche.stand() : null,
    feierabend: t.fertig ? {bilanz: Spiel.tag.bilanz(), ausblick: Spiel.hub.ausblick()} : null,
  };
};
