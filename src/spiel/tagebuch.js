"use strict";
/* ---------- Spieltagebuch: lokal messen statt raten (Design – Spielspaß 2.0, Hebel 12; Architektur § 9.3) ----------
   st.tagebuch = [{t, art:"sitzung", bis} | {t, art:"auftrag-ende", id, form, quelle, niveau, sek, sterne, hilfe, versuche, weiter}]
   höchstens 500 Einträge. „weiter“ = der nächste Auftrag beginnt binnen 2 Minuten (Weiterspiel-Rate).
   Nichts verlässt den Rechner – die Auswertung ist Text, den der Spieler bewusst kopiert (R8). */
Spiel.tagebuch = {};
Spiel.TAGEBUCH = {MAX: 500, WEITER_MS: 2 * 60 * 1000};
(() => {

Spiel.tagebuch.daten = function(){
  const st = Spiel.st;
  if (!Array.isArray(st.tagebuch)) st.tagebuch = [];
  return st.tagebuch;
};
const tbSchreiben = e => {
  const tb = Spiel.tagebuch.daten();
  tb.push(e);
  if (tb.length > Spiel.TAGEBUCH.MAX) tb.splice(0, tb.length - Spiel.TAGEBUCH.MAX);
  return e;
};
const tbLetzte = art => { const tb = Spiel.tagebuch.daten(); for (let i = tb.length - 1; i >= 0; i--) if (tb[i] && tb[i].art === art) return tb[i]; return null; };

/* Programmstart: offene Fragen der letzten Sitzung schließen, neue Sitzung beginnen */
Spiel.tagebuch.sitzung = function(){
  for (const e of Spiel.tagebuch.daten()) if (e && e.art === "auftrag-ende" && e.weiter == null) e.weiter = false;
  return tbSchreiben({t: jetzt(), art: "sitzung", bis: jetzt()});
};
/* Lebenszeichen: Sitzungsdauer = Start bis zur letzten Handlung (nicht bis zum Schließen – das Programm läuft oft im Tray) */
Spiel.tagebuch.aktiv = function(){
  const s = tbLetzte("sitzung");
  if (s) s.bis = Math.max(s.bis || s.t, jetzt());
};
Spiel.tagebuch.auftragEnde = function(inst, def, abnahme){
  Spiel.tagebuch.aktiv();
  return tbSchreiben({t: jetzt(), art: "auftrag-ende", id: def.id, form: def.art || "stoerung", quelle: inst.quelle || "postfach",
    niveau: abnahme.niveau, sek: Math.round((inst.zeitMs || 0) / 1000), sterne: abnahme.sterne, hilfe: inst.hilfeStufe || 0,
    versuche: inst.abnahmen || 1, weiter: null});
};
/* Ein Auftrag wird geöffnet: Hat der Spieler nach dem letzten Abschluss weitergemacht? */
Spiel.tagebuch.weiter = function(){
  const e = tbLetzte("auftrag-ende");
  if (e && e.weiter == null) e.weiter = jetzt() - e.t <= Spiel.TAGEBUCH.WEITER_MS;
  Spiel.tagebuch.aktiv();
};

/* Kurze Auswertung zum Einfügen in einen Chat (Zahlen statt „fühlt sich langweilig an“) */
Spiel.tagebuch.auswertung = function(){
  const tb = Spiel.tagebuch.daten().filter(e => e && typeof e.t === "number");
  const tag = t => heute(new Date(t));
  const zahl = (x, n = 1) => String(Math.round(x * 10 ** n) / 10 ** n).replace(".", ",");
  const pz = (a, b) => b ? Math.round(100 * a / b) + " %" : "–";
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  const median = l => { if (!l.length) return 0; const s = l.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const sitz = tb.filter(e => e.art === "sitzung"), auf = tb.filter(e => e.art === "auftrag-ende");
  const zeilen = ["Netzwerk-Labor · Spieltagebuch"];
  if (!tb.length) return zeilen.concat("Noch keine Einträge.").join("\n");
  const von = tag(tb[0].t), bis = tag(tb[tb.length - 1].t), tage = tageZwischen(von, bis) + 1;
  zeilen[0] += von === bis ? ` · ${datumKurz(von)}` : ` · ${datumKurz(von)}–${datumKurz(bis)} (${tage} Tage)`;
  const minuten = sitz.map(s => Math.max(0, ((s.bis || s.t) - s.t) / 60000));
  zeilen.push(`Sitzungen ${sitz.length} · Median ${Math.round(median(minuten))} min · ${zahl(sitz.length / Math.max(1, tage / 7))} pro Woche`);
  const formen = {}, niveaus = {};
  for (const a of auf) { formen[a.form] = (formen[a.form] || 0) + 1; niveaus[a.niveau] = (niveaus[a.niveau] || 0) + 1; }
  const FORM = {stoerung: "Störung", projekt: "Projekt", wartung: "Wartung", mini: "Mini"};
  zeilen.push(`Aufträge ${auf.length}` + Object.entries(formen).map(([f, n]) => ` · ${FORM[f] || f} ${n}`).join("") +
    ["E", "AP1", "AP2"].filter(n => niveaus[n]).map(n => ` · ${n} ${niveaus[n]}`).join(""));
  if (auf.length) {
    zeilen.push(`Erstversuch ${pz(auf.filter(a => (a.versuche || 1) === 1).length, auf.length)} · Hilfe ${pz(auf.filter(a => a.hilfe > 0).length, auf.length)}` +
      ` · Ø ${zahl(auf.reduce((s, a) => s + (a.sterne || 0), 0) / auf.length)} ★ · Ø Dauer ${mmss(auf.reduce((s, a) => s + (a.sek || 0), 0) / auf.length)}`);
    const entschieden = auf.filter(a => a.weiter != null);
    zeilen.push(`Weiterspiel-Rate ${pz(entschieden.filter(a => a.weiter).length, entschieden.length)} (nächster Auftrag < 2 min)`);
  }
  const r = Spiel.st.tagesraetsel || {}, raetsel = Object.keys(r).filter(k => /^\d{4}-\d\d-\d\d$/.test(k)).length;
  const dx = Spiel.dex ? Spiel.dex.zaehlen() : null;
  zeilen.push(`Tagesrätsel ${raetsel}` + (dx ? ` · Fehlerdex ${dx.gesehen}/${dx.gesamt} gesehen, ${dx.verstanden} verstanden` : ""));
  return zeilen.join("\n");
};
const datumKurz = tag => { const [j, m, d] = tag.split("-"); return `${+d}.${+m}.${j}`; };
})();
