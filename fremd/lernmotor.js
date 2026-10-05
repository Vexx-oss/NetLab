/* ============================================================================
   FREMDE DATEI — NICHT HIER BEARBEITEN.

   Herkunft : FISI-Spielhalle/src/lernmotor.js
   Geholt   : 2026-10-05
   SHA256   : 66084B817C8912783C49ED27C4B2876B5FF6794050FD17078C29DE2BB8788490
   Zeilen   : 86

   Warum die Kopie hier liegt:
   Das Netzwerk-Labor und die FISI-Spielhalle teilen sich EINEN Lernmotor
   (Beherrschungsstufen, Wiederholung nach Plan, Fehlerheft). Bisher holte
   auen.py ihn aus ../FISI-Spielhalle/src/lernmotor.js — also von ausserhalb
   des Repositoriums. Damit liess sich das Netzwerk-Labor allein nicht bauen, und
   auf GitHub schon gar nicht. FISI-Spielhalle ist zudem nicht versioniert (kein
   Git), es gibt dort also keine Historie, auf die man sich stuetzen koennte.

   Diese Kopie ist der Stand, mit dem das Netzwerk-Labor gebaut und getestet ist.
   Sie ist der Bauquelle gleichwertig, solange die Pruefsumme stimmt.

   Pruefen, ob die Spielhalle inzwischen weiter ist:
       python tools/lernmotor.py                 (meldet gleich / ABWEICHUNG)
       python tools/lernmotor.py --neu-einlesen   (Kopie bewusst erneuern)

   Aenderungen am Lernmotor gehoeren in die FISI-Spielhalle und werden danach
   hier mit --neu-einlesen uebernommen — nie umgekehrt.
   ============================================================================ */
"use strict";
/* ---------- Lernmotor: Beherrschung, Wiederholung nach Plan, Fehlerheft ----------
   Jede „Einheit“ (eine Fertigkeit wie sub.block oder ein Inhalt wie eine Karte k:net-01)
   hat eine Stufe 0–5 (Leitner-Fächer). Richtig ohne Hilfe, wenn fällig → eine Stufe hoch,
   nächste Wiederholung nach 1 / 3 / 7 / 14 / 30 Tagen. Falsch → zurück auf Stufe 1 (neu bleibt neu),
   heute noch einmal fällig. Gespeichert wird nur im Browser (localStorage). */
const L = (() => {
  const INTERVALL = [0,1,3,7,14,30];
  const STUFEN = ["neu","gesehen","geübt","sicher","gemeistert","gemeistert ★"];
  const SKILLS = {};            /* id → {id, name, thema, ap, spiel} */
  const THEMEN = ["Netzwerk","Hardware","Kalkulation","Projektmanagement","Fachbegriffe","Karten"];
  const leer = () => ({v:1, units:{}, log:[], fehler:[], tage:{}, tests:[]});
  let st = (() => { const s = store.get("lern", null); return s && s.v === 1 ? s : leer(); })();
  const save = () => store.set("lern", st);

  function skill(id, name, thema, ap, spiel){ SKILLS[id] = {id, name, thema, ap, spiel}; }
  const get = id => st.units[id] || null;
  const box = id => st.units[id]?.box || 0;
  const versucht = id => { const u = st.units[id]; return !!u && (u.r + u.f) > 0; };
  function stufeName(id){ const u = get(id); if (!u || !(u.r+u.f)) return "neu"; return u.box === 0 ? "angefangen" : STUFEN[u.box]; }

  function ueben(id, ok, {hilfe=false, sicher=false}={}){
    const t = heute();
    const u = st.units[id] ||= {box:0, due:null, r:0, f:0, last:null, sf:0};
    const vorher = u.box, faellig = !u.due || u.due <= t;
    /* Behaltensmessung: erste Antwort des Tages auf eine fällige, schon gelernte Einheit */
    if (u.box > 0 && u.last && u.last !== t && faellig) {
      st.log.push({d:t, id, ok, abst: tageZwischen(u.last, t)});
      if (st.log.length > 3000) st.log.splice(0, st.log.length - 3000);
    }
    if (ok) {
      u.r++;
      if (!hilfe && faellig) { u.box = Math.min(5, u.box+1); u.due = plusTage(t, INTERVALL[u.box]); }
      else if (faellig) u.due = plusTage(t, 1);
    } else {
      u.f++; if (sicher) u.sf++;
      if (u.box > 1) u.box = 1;
      u.due = t;
    }
    u.last = t;
    st.tage[t] = (st.tage[t]||0) + 1;
    save();
    return {vorher, nachher:u.box};
  }
  const istFaellig = id => { const u = get(id); return !!u && !!u.due && u.due <= heute(); };
  function faelligeIds(filter=()=>true){
    const t = heute();
    return Object.entries(st.units).filter(([id,u]) => u.due && u.due <= t && filter(id))
      .sort((a,b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box).map(([id]) => id);
  }
  function fehler(spiel, unit, text){
    st.fehler.unshift({t:heute(), spiel, unit, text});
    if (st.fehler.length > 200) st.fehler.length = 200;
    save();
  }
  function haeufigeFehler(tage=14){
    const grenze = plusTage(heute(), -tage), n = {};
    for (const f of st.fehler) if (f.t >= grenze && f.unit) n[f.unit] = (n[f.unit]||0) + 1;
    return Object.entries(n).sort((a,b)=>b[1]-a[1]).map(([id,z]) => ({id, z}));
  }
  const heuteZahl = () => st.tage[heute()] || 0;
  /* Serie: Lerntage in Folge; ein einzelner verpasster Tag unterbricht nicht */
  function serie(){
    let d = heute(), n = 0, luecke = 0;
    for (let i=0; i<500; i++) {
      if (st.tage[d]) { n++; luecke = 0; }
      else if (++luecke >= 2 && i > 0) break;
      d = plusTage(d, -1);
    }
    return n;
  }
  function behalten(){
    const b = {"1":[0,0], "3":[0,0], "7":[0,0]};
    for (const e of st.log) { const k = e.abst <= 2 ? "1" : e.abst <= 6 ? "3" : "7"; b[k][1]++; if (e.ok) b[k][0]++; }
    return b;
  }
  function test(art, pct, note){ st.tests.push({d:heute(), art, pct, note}); save(); }
  function themaStand(thema){
    const ids = Object.values(SKILLS).filter(s=>s.thema===thema).map(s=>s.id);
    if (!ids.length) return 0;
    return ids.reduce((a,id)=>a+box(id),0) / (ids.length*5);
  }
  function reset(){ st = leer(); save(); }
  return {INTERVALL, STUFEN, SKILLS, THEMEN, skill, ueben, get, box, versucht, stufeName, istFaellig, faelligeIds,
          fehler, haeufigeFehler, heuteZahl, serie, behalten, test, themaStand, reset, get st(){ return st; }};
})();
