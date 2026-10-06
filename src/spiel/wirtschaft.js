"use strict";
/* ---------- Spiel: Wirtschaft und Shop (Konzept § 3.5 „Wirtschaft bewusst dünn“) ----------
   Euro kaufen: Zusatzwerkzeuge (Kabeltester, Netzprüfer – spiel/werkzeuge.js), Playbook-Slots und Playbooks,
   Wartungsvertrag anbieten (ab genug Sternen bei diesem Kunden) und Aussehen.
   NIE Kernwerkzeuge (Simulation, Inspektor, Konsole, Hilfe, Wiki).
   Ruf ist kein Zahlungsmittel.

   P5b „Shop entlasten“: Die Shop-ANSICHT (ui/karriere.js shopAnsicht) zeigt nur noch die zwei Gruppen aus
   Spiel.shop.GRUPPEN. Die übrigen Artikel bleiben in der Liste, weil ihre neue Heimat sie benutzt – sonst
   liefen Kundenkarte und Auswahl leer:
     art "vertrag"   → Kundenakte (ui/karriere.js kundenAnsicht kauft „vertrag:<kunde>“); im Shop nur ein Verweis
     art "aussehen"  → EINE aufklappbare Zeile im Shop (Kauf), Auswahl in den Einstellungen „Darstellung“
     Prüfungsanmeldung → GESTRICHEN. Sie kostete 60/90 €, ohne dass die Prüfung davon wusste: Spiel.pruefung.starten
       bucht Spiel.PRUEFUNG.GEBUEHR ab (40/80 €) und erlässt die erste Prüfung. Es gibt genau EINE Preisquelle:
       Spiel.PRUEFUNG.GEBUEHR (spiel/pruefung.js) – beide Anzeigen ziehen daraus.

   Spiel.shop.liste() → [{id, art, titel, text, preis, zustand:"kaufbar"|"gesperrt"|"gekauft"|"aktiv"|"zu-teuer"|"kein-slot", grund, gruppe}]
   Spiel.shop.kaufen(id) → {ok, grund} */

Spiel.WIRTSCHAFT = {
  VERTRAG_STERNE: 8,                 /* so viele Sterne (Summe) bei einem Kunden, dann kannst du einen Vertrag anbieten */
};

/* Aussehen: Akzentfarben für den Leitstand und Stile für die Leiste. Rein kosmetisch. */
Spiel.AUSSEHEN = [
  {id: "cyan",      art: "akzent", titel: "Signal-Cyan",  text: "Der Standard des Leitstands.", preis: 0, farbe: "#4FC3F7"},
  {id: "bernstein", art: "akzent", titel: "Bernstein",    text: "Warmes Gelb wie eine Statusleuchte.", preis: 120, farbe: "#FBBF24"},
  {id: "minze",     art: "akzent", titel: "Minze",        text: "Ruhiges Grün für lange Abende.", preis: 120, farbe: "#34D399"},
  {id: "koralle",   art: "akzent", titel: "Koralle",      text: "Kräftiges Rot-Orange.", preis: 160, farbe: "#FB7185"},
  {id: "violett",   art: "akzent", titel: "Violett",      text: "Kühles Lila wie ein Rack bei Nacht.", preis: 160, farbe: "#A78BFA"},
  {id: "standard",  art: "leiste", titel: "Leiste: Klar",   text: "Schlichte, dunkle Leiste.", preis: 0},
  {id: "glas",      art: "leiste", titel: "Leiste: Glas",   text: "Durchscheinend mit weichem Rand.", preis: 80},
  {id: "schiene",   art: "leiste", titel: "Leiste: Schiene", text: "Feine Linie in deiner Akzentfarbe an der Kante.", preis: 100},
  {id: "raster",    art: "leiste", titel: "Leiste: Raster", text: "Dezentes Punktraster wie ein Patchfeld.", preis: 100},
];

Spiel.shop = {};

/* Die Gruppen, die die Shop-Ansicht zeigt – Reihenfolge = Reihenfolge im Bild (Single Source für die Ansicht) */
Spiel.shop.GRUPPEN = ["Werkzeuge", "Automatisierung"];

Spiel.shop.eintrag = function(e){
  const euro = Spiel.st.euro;
  if (e.zustand === "kaufbar" && e.preis > euro + 1e-9) { e.zustand = "zu-teuer"; e.grund = `Dir fehlen ${eur(e.preis - euro)} €.`; }
  return e;
};

Spiel.shop.liste = function(){
  const st = Spiel.st, k = Spiel.karriere.daten(), liste = [];
  /* Werkzeuge (Hebel 8): Fähigkeiten statt Automatisierung – Lerninhalt, bleibt im Shop */
  for (const [id, w] of Object.entries(Spiel.SHOP_WERKZEUGE || {})) {
    const hat = Spiel.werkzeug.hat(id);
    liste.push(Spiel.shop.eintrag({id: "werkzeug:" + id, art: "werkzeug", gruppe: "Werkzeuge", titel: w.titel, text: w.text, preis: w.preis,
      zustand: hat ? "gekauft" : st.stufe < w.ab ? "gesperrt" : "kaufbar", grund: hat ? null : st.stufe < w.ab ? `Ab Stufe ${w.ab}.` : null}));
  }
  /* Slots */
  const slotPreis = Spiel.playbooks.slotPreis();
  liste.push(Spiel.shop.eintrag({
    id: "slot", art: "slot", gruppe: "Automatisierung", titel: "Playbook-Slot",
    text: `Du hast ${st.playbooks.slots} Slot${st.playbooks.slots === 1 ? "" : "s"}. Jeder Slot hält ein Playbook.`,
    preis: slotPreis, zustand: slotPreis == null ? "gekauft" : "kaufbar", grund: slotPreis == null ? "Alle Slots gekauft." : null,
  }));
  /* Playbooks: gekaufte, kaufbare und die nächsten gesperrten (nur freigeschaltete Stufen).
     „kein-slot“ bleibt ein eigener Zustand: dann hilft ein weiterer Slot, nicht Üben. */
  for (const p of Spiel.playbooks.liste()) {
    const s = Spiel.karriere.skills().find(x => x.id === p.skill) || {};
    if ((s.stufe || 1) > st.stufe && p.zustand === "gesperrt") continue;
    liste.push(Spiel.shop.eintrag({
      id: "playbook:" + p.skill, art: "playbook", gruppe: "Automatisierung", skill: p.skill,
      titel: "Playbook: " + p.name, preis: p.preis ?? Spiel.playbooks.preis(p.skill),
      /* Die Ansicht zeigt Playbooks als LISTE (Name · Zustand · Preis) und den Erklärsatz EINMAL als Fußnote. */
      text: p.zustand === "aktiv" || p.zustand === "veraltet" ? p.text : "Erledigt Wartungs-Tickets dieser Fertigkeit von selbst (60 % Ertrag, ohne Lernwirkung). Automatisieren darf nur, was du sicher beherrschst.",
      zustand: p.zustand === "aktiv" || p.zustand === "veraltet" ? p.zustand : p.zustand === "kaufbar" ? "kaufbar" : p.zustand === "kein-slot" ? "kein-slot" : "gesperrt",
      grund: p.zustand === "kaufbar" ? null : p.zustand === "gesperrt" ? `ab „sicher“ (jetzt: ${Spiel.karriere.stufeName(p.skill)})` : p.text,
    }));
  }
  /* Wartungsverträge: Artikel für die KUNDENAKTE (ui/karriere.js kundenAnsicht). Die Shop-Ansicht zeigt dazu
     nur einen Verweis – der Kauf gehört zum Kunden, nicht in den Laden. */
  for (const id of Spiel.karriere.kundenIds()) {
    const kd = Spiel.karriere.kunde(id);
    if (kd.spaeter || !(kd.euroProStunde > 0)) continue;
    const offen = Spiel.karriere.kundeOffen(id);
    const sterne = Spiel.karriere.sterneBei(id).reduce((a, b) => a + b, 0);
    const hat = Spiel.karriere.hatVertrag(id);
    let zustand = "kaufbar", grund = null;
    if (hat) { zustand = "gekauft"; grund = "Vertrag läuft."; }
    else if (!offen) { zustand = "gesperrt"; grund = `Kunde ab Ruf ${kd.abRuf}.`; }
    else if (sterne < Spiel.WIRTSCHAFT.VERTRAG_STERNE) { zustand = "gesperrt"; grund = `Noch ${Spiel.WIRTSCHAFT.VERTRAG_STERNE - sterne} Sterne bei ${kd.kurz || kd.name} (${sterne} von ${Spiel.WIRTSCHAFT.VERTRAG_STERNE}).`; }
    liste.push(Spiel.shop.eintrag({
      id: "vertrag:" + id, art: "vertrag", gruppe: "Kunden", kunde: id,
      titel: "Wartungsvertrag anbieten: " + kd.name,
      text: `Bringt ${eur(kd.euroProStunde)} €/h, solange die Ampel grün ist. Dafür kommen Wartungs-Tickets mit Frist.` + (kd.vertragRabatt ? ` −${Math.round(kd.vertragRabatt * 100)} % für Vertrauen ${Spiel.VERTRAUEN_LOHN.rabatt}.` : ""),
      preis: kd.vertragPreis, zustand, grund,
    }));
  }
  /* Aussehen: EINE aufklappbare Zeile in der Shop-Ansicht; die Auswahl der gekauften steht in den
     Einstellungen („Darstellung“). Der Kauf bleibt hier – app.js (P5a) gehört einem anderen Schreiber. */
  for (const a of Spiel.AUSSEHEN) {
    const gekauft = k.aussehen.gekauft.includes(a.id);
    const aktiv = (a.art === "akzent" ? k.aussehen.akzent : k.aussehen.leiste) === a.id;
    liste.push(Spiel.shop.eintrag({
      id: "aussehen:" + a.id, art: "aussehen", gruppe: "Aussehen", aussehen: a.id, aussehenArt: a.art, farbe: a.farbe || null,
      titel: a.titel, text: a.text, preis: a.preis, zustand: aktiv ? "aktiv" : gekauft ? "gekauft" : "kaufbar", grund: null,
    }));
  }
  return liste;
};

Spiel.shop.kaufen = function(id){
  const [art, was] = String(id).split(":");
  const k = Spiel.karriere.daten();
  if (art === "werkzeug") return Spiel.werkzeug.kaufen(was);
  if (art === "slot") return Spiel.playbooks.slotKaufen();
  if (art === "playbook") return Spiel.playbooks.kaufen(was);
  if (art === "vertrag") {
    const e = Spiel.shop.liste().find(x => x.id === id);
    if (!e) return {ok: false, grund: "Unbekannter Kunde."};
    if (e.zustand !== "kaufbar") return {ok: false, grund: e.grund};
    if (!Spiel.karriere.bezahlen(e.preis, "Wartungsvertrag: " + Spiel.karriere.kunde(was).name)) return {ok: false, grund: "Nicht genug Euro."};
    Spiel.wartung.vertragStarten(was);
    Spiel.melden("vertrag", {kunde: was});
    Spiel.geaendert ? Spiel.geaendert("vertrag") : Spiel.speichern();
    Spiel.sofortSpeichern();                    /* bezahlt ist bezahlt: sofort auf die Platte, nicht erst nach der Entprellung */
    return {ok: true, satz: Spiel.shop.kundenSatz(was, "vertrag")};
  }
  /* „pruefung“ ist gestrichen (P5b): Preis und Abbuchung der Prüfung stehen in Spiel.PRUEFUNG.GEBUEHR
     (spiel/pruefung.js). Hier gibt es bewusst keinen zweiten Bezahlweg mehr. */
  if (art === "aussehen") {
    const a = Spiel.AUSSEHEN.find(x => x.id === was);
    if (!a) return {ok: false, grund: "Unbekannt."};
    if (!k.aussehen.gekauft.includes(was)) {
      if (!Spiel.karriere.bezahlen(a.preis, "Aussehen: " + a.titel)) return {ok: false, grund: `Dir fehlen ${eur(a.preis - Spiel.st.euro)} €.`};
      k.aussehen.gekauft.push(was);
    }
    if (a.art === "akzent") k.aussehen.akzent = was; else k.aussehen.leiste = was;
    Spiel.geaendert ? Spiel.geaendert("aussehen") : Spiel.speichern();
    Spiel.sofortSpeichern();                    /* bezahlt ist bezahlt: sofort auf die Platte, nicht erst nach der Entprellung */
    Spiel.melden("aussehen", tief(k.aussehen));
    return {ok: true};
  }
  return {ok: false, grund: "Unbekannter Artikel."};
};

/* Ein Satz des Kunden (DATEN.kunden[k].saetze[anlass]) – Text, Liste oder Funktion */
Spiel.shop.kundenSatz = function(id, anlass){
  const s = Spiel.karriere.kunde(id).saetze || {};
  let w = s[anlass] ?? (anlass === "vertrag" ? s.dank : null);
  if (typeof w === "function") { try { w = w({}); } catch (e) { w = null; } }
  if (Array.isArray(w)) w = w[0];
  return w ? String(w) : null;
};
