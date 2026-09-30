"use strict";
/* ---------- Spiel: Offline-Bericht (Konzept § 3.4) ----------
   Spiel.tick() merkt sich nach einer Lücke ≥ 10 min, was in der angerechneten Zeit (höchstens 8 h)
   passiert ist. Die Oberfläche zeigt es beim Öffnen als ruhige Karte:
   „Während du weg warst: 3 Wartungen automatisch erledigt (+42 €), 2 Tickets warten, Praxis ist rot.“ */

Spiel.offline = {};

Spiel.offline.merken = function(prot, luecke){
  const k = Spiel.karriere.daten();
  const alt = k.bericht && !k.bericht.gesehen ? k.bericht : null;
  const auto = (alt ? alt.auto : 0) + prot.auto.length;
  const autoEuro = (alt ? alt.autoEuro : 0) + prot.playbookEuro;
  const vertragEuro = (alt ? alt.vertragEuro : 0) + prot.vertragEuro;
  k.bericht = {
    von: alt ? alt.von : prot.von, bis: prot.bis,
    weg: (alt ? alt.weg : 0) + luecke,
    angerechnet: (alt ? alt.angerechnet : 0) + prot.angerechnet,
    gedeckelt: (alt && alt.gedeckelt) || luecke > Spiel.WARTUNG.OFFLINE_MAX,
    auto, autoEuro: Math.round(autoEuro * 100) / 100, vertragEuro: Math.round(vertragEuro * 100) / 100,
    neu: (alt ? alt.neu : 0) + prot.neu.length, verpasst: (alt ? alt.verpasst : 0) + prot.verpasst,
    gesehen: false,
  };
  return k.bericht;
};

/* Ungesehener Bericht mit aktuellem Stand (wartende Tickets, Ampeln) oder null */
Spiel.offlineBericht = function(){
  const k = Spiel.karriere.daten();
  const b = k.bericht;
  if (!b || b.gesehen) return null;
  const t = jetzt();
  const ampeln = {rot: [], gelb: []};
  for (const id of Spiel.karriere.vertragskunden()) {
    const a = Spiel.wartung.ampelBei(id, t);
    if (a === "rot" || a === "gelb") ampeln[a].push(id);
  }
  const wartend = typeof Spiel.postfach === "function" ? Spiel.postfach().length : (Spiel.st.postfach || []).length;
  const r = Object.assign({}, b, {wartend, rot: ampeln.rot, gelb: ampeln.gelb, euro: Math.round((b.autoEuro + b.vertragEuro) * 100) / 100});
  r.text = Spiel.offline.text(r);
  r.teile = Spiel.offline.teile(r);
  return r;
};

Spiel.offline.dauerText = function(ms){
  const min = Math.round(ms / 60e3);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/* Einzelne Sätze (für die Karte als Liste) */
Spiel.offline.teile = function(r){
  const name = id => { const k = Spiel.karriere.kunde(id); return k.kurz || k.name; };
  const liste = (ids) => ids.length <= 1 ? ids.map(name).join("") : ids.slice(0, -1).map(name).join(", ") + " und " + name(ids[ids.length - 1]);
  const t = [];
  if (r.auto) t.push(`${r.auto} Wartung${r.auto === 1 ? "" : "en"} automatisch erledigt (+${eur(r.autoEuro)} €)`);
  if (r.vertragEuro >= 0.01) t.push(`Wartungsverträge: +${eur(r.vertragEuro)} €`);
  if (r.wartend) t.push(`${r.wartend} Ticket${r.wartend === 1 ? " wartet" : "s warten"}`);
  if (r.rot.length) t.push(`${liste(r.rot)} ${r.rot.length === 1 ? "ist" : "sind"} rot`);
  if (r.gelb.length) t.push(`${liste(r.gelb)} ${r.gelb.length === 1 ? "ist" : "sind"} gelb`);
  return t;
};

Spiel.offline.text = function(r){
  const t = Spiel.offline.teile(r);
  if (!t.length) return "Während du weg warst, blieb alles ruhig.";
  return "Während du weg warst: " + t.join(", ") + ".";
};

Spiel.offlineBerichtGesehen = function(){
  const k = Spiel.karriere.daten();
  if (k.bericht) { k.bericht.gesehen = true; Spiel.speichern(); }
};
