"use strict";
/* ---------- Abzeichen: Meilensteine fürs Können, nicht fürs Grinden ----------
   Spiel.abzeichen.liste()    → [{id, sym, titel, text, lehrt, ist, soll, erhalten: t|null}]
   Spiel.abzeichen.pruefen()  → neu erhaltene Abzeichen (speichert; merkt sie als „ungezeigt“)
   Spiel.abzeichen.abholen()  → die ungezeigten (und vergisst sie) – die Oberfläche zeigt sie im Ergebnis oder als Toast
   Spiel.abzeichen.zaehlen(name, n = 1)  Zähler für Dinge, die der Spielstand sonst nicht merkt (richtige Vorhersagen)
   Jedes Abzeichen belohnt eine Arbeitsweise, die im Beruf zählt: selbst eingrenzen, vorher denken,
   sauber speichern, verteilt üben. Nichts davon lässt sich durch stumpfes Wiederholen am selben Tag erzwingen. */
Spiel.abzeichen = {};

Spiel.ABZEICHEN = (() => {
  const abzLern = f => (typeof L !== "undefined" ? f() : 0);
  const abzErledigt = st => st.erledigt.filter(e => e.quelle !== "pruefung");
  return [
    {id: "erster-kunde", sym: "🎫", titel: "Erster Kunde", text: "Das erste Ticket abgenommen.",
      lehrt: "Jede Störung beginnt bei Schicht 1: Steckt das Kabel, leuchtet der Link?", soll: 1, ist: st => abzErledigt(st).length},
    {id: "selbst-gefunden", sym: "🧭", titel: "Selbst gefunden", text: "5 Tickets ganz ohne Hilfeleiter gelöst.",
      lehrt: "Eingrenzen statt raten: Symptom → Schicht → Gerät → Einstellung.", soll: 5, ist: st => abzErledigt(st).filter(e => !e.hilfe).length},
    {id: "saubere-arbeit", sym: "✨", titel: "Saubere Arbeit", text: "10 Tickets mit 4,5 Sternen oder mehr.",
      lehrt: "Ziel erfüllt, nichts nebenbei kaputt gemacht, alles gespeichert.", soll: 10, ist: st => abzErledigt(st).filter(e => (e.sterne || 0) >= 4.5).length},
    {id: "hellseher", sym: "🔮", titel: "Hellseher", text: "10 Pings richtig vorhergesagt.",
      lehrt: "Erst eine Erwartung bilden, dann messen – so findet man Fehler schneller.", soll: 10, ist: (st, z) => z.vorhersageRichtig || 0},
    {id: "spuernase", sym: "🔎", titel: "Spürnase", text: "3 Verdachte voll getroffen – vor dem Eingriff.",
      lehrt: "Erst ermitteln, dann eine Hypothese aufschreiben, dann eingreifen: So arbeiten Profis.", soll: 3, ist: (st, z) => z.verdachtTreffer || 0},
    {id: "von-unten", sym: "🪜", titel: "Von unten nach oben", text: "In 3 Aufträgen im Terminal von unten diagnostiziert: Adresse, dann Weg, dann Name.",
      lehrt: "Erst die eigene Adresse (ipconfig), dann der Weg (ping), dann der Name (nslookup) – so grenzt man ein, statt oben zu raten.", soll: 3, ist: (st, z) => z.leiterVonUnten || 0},
    {id: "pausenprofi", sym: "🧩", titel: "Pausenprofi", text: "25 Mini-Tickets richtig gelöst.",
      lehrt: "Kurze Wiederholungen zwischendurch halten Wissen frisch.", soll: 25, ist: st => (st.mini && st.mini.richtig) || 0},
    {id: "tagwerk", sym: "✅", titel: "Tagwerk", text: "An einem Tag das Tagesziel geschafft (3 Tickets).",
      lehrt: "Ein fester kleiner Umfang pro Tag trägt weiter als ein langer Abend.", soll: 3,
      ist: st => { const n = {}; for (const e of abzErledigt(st)) n[e.tag] = (n[e.tag] || 0) + 1; return Math.max(0, ...Object.values(n)); }},
    {id: "dranbleiber", sym: "🔥", titel: "Dranbleiber", text: "An 3 Tagen in Folge geübt.",
      lehrt: "Verteiltes Üben schlägt Pauken am Vorabend.", soll: 3, ist: () => abzLern(() => L.serie())},
    {id: "wochenserie", sym: "📅", titel: "Eine Woche am Stück", text: "An 7 Tagen in Folge geübt.",
      lehrt: "Eine Woche Routine – ab hier wird Wiederholen zur Gewohnheit.", soll: 7, ist: () => abzLern(() => L.serie())},
    {id: "bereitschaft", sym: "🚑", titel: "Bereitschaftsdienst", text: "10 fällige Wiederholungen erledigt.",
      lehrt: "Wiederholen, wenn es fällig ist – kurz bevor man es vergisst.", soll: 10, ist: st => abzErledigt(st).filter(e => e.quelle === "wiederholung").length},
    {id: "stammkunde", sym: "🤝", titel: "Stammkunde", text: "Den ersten Wartungsvertrag abgeschlossen.",
      lehrt: "Wartung ist planbare Arbeit – und planbares Einkommen.", soll: 1,
      ist: () => (Spiel.karriere && Spiel.karriere.vertragskunden ? Spiel.karriere.vertragskunden().length : 0)},
    {id: "nvram", sym: "💾", titel: "Gespeichert ist gespeichert", text: "5 Tickets auf Niveau AP2 bestanden – samt Neustart-Test.",
      lehrt: "Die running-config lebt im RAM; nur die startup-config übersteht einen Neustart.", soll: 5, ist: st => abzErledigt(st).filter(e => e.niveau === "AP2").length},
    {id: "geselle", sym: "🛠", titel: "Geselle", text: "Stufe 2 erreicht.",
      lehrt: "Aufstieg braucht Ruf UND Können – Kunden zufrieden und Themen sicher.", soll: 1, ist: st => (st.stufe >= 2 ? 1 : 0)},
    {id: "spezialist", sym: "🧠", titel: "Spezialist", text: "Stufe 4 erreicht.",
      lehrt: "Routing, NAT und ACLs sitzen – jetzt kommen Standorte und Internet.", soll: 1, ist: st => (st.stufe >= 4 ? 1 : 0)},
    {id: "senior", sym: "👑", titel: "Senior", text: "Stufe 5 erreicht.",
      lehrt: "Firewall, DMZ, Mittelstand: Du bist jetzt die Person, die man anruft.", soll: 1, ist: st => (st.stufe >= 5 ? 1 : 0)},
    {id: "pruefungsreif", sym: "🎓", titel: "Prüfungsreif", text: "Einen Prüfungstag bestanden.",
      lehrt: "Unter Zeitdruck und ohne Hilfe sauber arbeiten – wie in der echten Abschlussprüfung.", soll: 1, ist: st => (st.zertifikate || []).length},
  ];
})();

Spiel.abzeichen.daten = function(st = Spiel.st){
  if (!st.abzeichen || typeof st.abzeichen !== "object" || Array.isArray(st.abzeichen)) st.abzeichen = {};
  const d = st.abzeichen;
  if (!d.erhalten || typeof d.erhalten !== "object") d.erhalten = {};
  if (!Array.isArray(d.neu)) d.neu = [];
  if (!d.zaehler || typeof d.zaehler !== "object") d.zaehler = {};
  return d;
};
Spiel.ergaenzer.abzeichen = st => { Spiel.abzeichen.daten(st); };

Spiel.abzeichen.def = id => Spiel.ABZEICHEN.find(a => a.id === id) || null;
Spiel.abzeichen.zaehlen = function(name, n = 1){
  if (Spiel._trocken) return;
  const z = Spiel.abzeichen.daten().zaehler;
  z[name] = (+z[name] || 0) + n;
};
Spiel.abzeichen.istWert = function(a){
  try { const x = +a.ist(Spiel.st, Spiel.abzeichen.daten().zaehler); return isFinite(x) ? x : 0; } catch (e) { return 0; }
};
Spiel.abzeichen.liste = function(){
  const d = Spiel.abzeichen.daten();
  return Spiel.ABZEICHEN.map(a => ({id: a.id, sym: a.sym, titel: a.titel, text: a.text, lehrt: a.lehrt, soll: a.soll,
    ist: Math.min(a.soll, Spiel.abzeichen.istWert(a)), erhalten: d.erhalten[a.id] || null}));
};
Spiel.abzeichen.pruefen = function(){
  if (Spiel._trocken) return [];
  const d = Spiel.abzeichen.daten(), neu = [];
  for (const a of Spiel.ABZEICHEN) {
    if (d.erhalten[a.id] || Spiel.abzeichen.istWert(a) < a.soll) continue;
    d.erhalten[a.id] = jetzt();
    d.neu.push(a.id);
    neu.push(a);
  }
  if (neu.length) Spiel.speichern();
  return neu;
};
Spiel.abzeichen.abholen = function(){
  const d = Spiel.abzeichen.daten();
  if (!d.neu.length) return [];
  const ids = d.neu.splice(0);
  Spiel.speichern();
  return ids.map(Spiel.abzeichen.def).filter(Boolean);
};
