"use strict";
/* ---------- Form „Hotline“: Rückfragen am Telefon (Plan – Ausbau 1.2, E1.4; Architektur § 9.6) ----------
   def.hotline = {max, fragen:[{id, text, antwort, wert:"gut"|"neutral"|"schlecht", warum}]}; inst.hotline = {gefragt:[id], fertig}
   Jede Antwort liegt als Karte in der Akte. Wer zwei gute Fragen stellt und keine Fachfrage an den Laien, bekommt +1 Ruf –
   gute Fragetechnik spart beim Kunden Zeit und Nerven. Nie eine Strafe: Schlechte Fragen kosten nur die Frage. */
Spiel.hotline = {};
Spiel.hotline.stand = function(inst){
  const def = Spiel.defVon(inst), h = def && def.hotline;
  if (!h) return null;
  const s = (inst.hotline ||= {gefragt: [], fertig: false});
  return {def: h, gefragt: s.gefragt, fertig: s.fertig || s.gefragt.length >= (h.max || 3), rest: Math.max(0, (h.max || 3) - s.gefragt.length)};
};
Spiel.hotline.fragen = function(inst, id){
  const st = Spiel.hotline.stand(inst);
  if (!st || st.fertig || st.gefragt.includes(id)) return null;
  const f = st.def.fragen.find(x => x.id === id);
  if (!f) return null;
  inst.hotline.gefragt.push(id);
  if (inst.hotline.gefragt.length >= (st.def.max || 3)) inst.hotline.fertig = true;
  const k = Spiel.kundenDaten(inst.kunde || Spiel.defVon(inst).kunde);
  Spiel.akte.hinzu(inst, {art: "hotline", von: id, nach: null, titel: `☎ ${(k.ansprechpartner || {}).name || k.name}: ${f.text}`, befund: f.antwort, ok: null});
  inst.fortschritt = jetzt();
  Spiel.speichern();
  Spiel.melden("arbeit-geaendert", {inst});
  return f;
};
Spiel.hotline.auflegen = function(inst){
  const st = Spiel.hotline.stand(inst); if (!st) return null;
  inst.hotline.fertig = true;
  Spiel.speichern();
  return Spiel.hotline.bewertung(inst);
};
Spiel.hotline.bewertung = function(inst){
  const st = Spiel.hotline.stand(inst); if (!st) return null;
  const gestellt = st.gefragt.map(id => st.def.fragen.find(f => f.id === id)).filter(Boolean);
  const gut = gestellt.filter(f => f.wert === "gut").length, schlecht = gestellt.filter(f => f.wert === "schlecht").length;
  const bonus = gut >= 2 && schlecht === 0;
  const text = !gestellt.length ? "Ohne Rückfrage losgelegt – beim nächsten Anruf lohnt eine Frage nach dem „Seit wann?“."
    : `Fragetechnik: ${gut} gute ${gut === 1 ? "Frage" : "Fragen"}${schlecht ? `, ${schlecht} Fachfrage an den Laien` : ""}${bonus ? " – +1 Ruf" : ""}.`;
  return {gut, schlecht, gestellt: gestellt.length, bonus, text, hinweise: gestellt.filter(f => f.wert !== "gut").map(f => f.warum)};
};
