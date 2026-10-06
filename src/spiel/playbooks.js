"use strict";
/* ---------- Spiel: Playbooks (Automatisierung, Konzept § 3.4) ----------
   Jede Fertigkeit ab L.box ≥ 3 („sicher“) ist als Playbook kaufbar (Euro, begrenzte Slots).
   Ein aktives Playbook erledigt Wartungs-Tickets dieser Fertigkeit automatisch für 60 % Ertrag,
   ohne Lernwirkung. Ist die Fertigkeit fällig (L.istFaellig), ist das Playbook „veraltet“ und pausiert,
   bis die Wiederholung gemacht ist („Wiederholung jetzt“ öffnet ein Mini oder ein Ticket).
   Spielstand: Spiel.st.playbooks = {slots, aktiv:[skillId]}. */

Spiel.PLAYBOOK = {
  AB_BOX: 3,                                      /* „sicher“ */
  SLOTS_MAX: 5,
  SLOT_PREISE: {2: 250, 3: 500, 4: 900, 5: 1400}, /* Preis des n-ten Slots (der erste ist frei) */
  PREIS_BASIS: 90, PREIS_JE_STUFE: 30,            /* Playbook-Preis = Basis + Stufe × je Stufe */
};

Spiel.playbooks = {};

Spiel.playbooks.preis = function(skill){
  const s = Spiel.karriere.skills().find(x => x.id === skill) || {stufe: 1};
  return Spiel.PLAYBOOK.PREIS_BASIS + (s.stufe || 1) * Spiel.PLAYBOOK.PREIS_JE_STUFE;
};
Spiel.playbooks.slotPreis = function(){
  const n = Spiel.st.playbooks.slots + 1;
  return n > Spiel.PLAYBOOK.SLOTS_MAX ? null : Spiel.PLAYBOOK.SLOT_PREISE[n];
};
Spiel.playbooks.hat = skill => Spiel.st.playbooks.aktiv.includes(skill);
Spiel.playbooks.veraltet = skill => Spiel.playbooks.hat(skill) && Spiel.karriere.faellig(skill);
/* Arbeitet das Playbook gerade? (gekauft und nicht veraltet) */
Spiel.playbooks.aktiv = skill => Spiel.playbooks.hat(skill) && !Spiel.karriere.faellig(skill);
Spiel.playbooks.freieSlots = () => Math.max(0, Spiel.st.playbooks.slots - Spiel.st.playbooks.aktiv.length);

/* Zustand einer Fertigkeit aus Playbook-Sicht */
Spiel.playbooks.status = function(skill){
  const box = Spiel.karriere.box(skill);
  const name = Spiel.karriere.skillName(skill);
  if (Spiel.playbooks.hat(skill)) {
    const alt = Spiel.karriere.faellig(skill);
    return {skill, name, box, zustand: alt ? "veraltet" : "aktiv",
      text: alt ? "Veraltet: die Fertigkeit ist zur Wiederholung fällig. Das Playbook pausiert, bis du sie wiederholt hast."
                : "Läuft: erledigt Wartungs-Tickets dieser Fertigkeit automatisch (60 % Ertrag, ohne Lernwirkung)."};
  }
  if (box < Spiel.PLAYBOOK.AB_BOX) {
    return {skill, name, box, zustand: "gesperrt", text: `Ab Stufe „sicher“ kaufbar (jetzt: ${Spiel.karriere.stufeName(skill)}). Automatisieren darf nur, was du sicher beherrschst.`};
  }
  const preis = Spiel.playbooks.preis(skill);
  if (!Spiel.playbooks.freieSlots()) return {skill, name, box, preis, zustand: "kein-slot", text: "Alle Slots belegt. Ein weiterer Slot oder ein anderes Playbook ablegen."};
  return {skill, name, box, preis, zustand: "kaufbar", text: `Kaufbar für ${preis} €.`};
};

Spiel.playbooks.liste = () => Spiel.karriere.skills().filter(s => (s.stufe || 1) <= Spiel.KARRIERE_MAX).map(s => Spiel.playbooks.status(s.id));

/* Kaufen → {ok, grund} */
Spiel.playbooks.kaufen = function(skill){
  const s = Spiel.playbooks.status(skill);
  if (s.zustand === "aktiv" || s.zustand === "veraltet") return {ok: false, grund: "Dieses Playbook hast du schon."};
  if (s.zustand !== "kaufbar") return {ok: false, grund: s.text};
  if (!Spiel.karriere.bezahlen(s.preis, "Playbook: " + s.name)) return {ok: false, grund: `Dir fehlen ${eur(s.preis - Spiel.st.euro)} €.`};
  Spiel.st.playbooks.aktiv.push(skill);
  Spiel.geaendert ? Spiel.geaendert("playbook") : Spiel.speichern();
  Spiel.sofortSpeichern();                    /* bezahlt ist bezahlt: sofort auf die Platte, nicht erst nach der Entprellung */
  return {ok: true};
};

/* Ablegen (Slot frei, kein Geld zurück) */
Spiel.playbooks.ablegen = function(skill){
  if (!Spiel.playbooks.hat(skill)) return false;
  Spiel.st.playbooks.aktiv = Spiel.st.playbooks.aktiv.filter(x => x !== skill);
  Spiel.geaendert ? Spiel.geaendert("playbook") : Spiel.speichern();
  Spiel.sofortSpeichern();                    /* Slotwechsel sofort festhalten (kein Geld, aber eine Entscheidung) */
  return true;
};

Spiel.playbooks.slotKaufen = function(){
  const preis = Spiel.playbooks.slotPreis();
  if (preis == null) return {ok: false, grund: `Mehr als ${Spiel.PLAYBOOK.SLOTS_MAX} Slots gibt es nicht.`};
  if (!Spiel.karriere.bezahlen(preis, "Playbook-Slot")) return {ok: false, grund: `Dir fehlen ${eur(preis - Spiel.st.euro)} €.`};
  Spiel.st.playbooks.slots++;
  Spiel.geaendert ? Spiel.geaendert("slot") : Spiel.speichern();
  Spiel.sofortSpeichern();                    /* bezahlt ist bezahlt: sofort auf die Platte, nicht erst nach der Entprellung */
  return {ok: true};
};

/* „Wiederholung jetzt“: passendes Mini (schnell) oder Ticket für die fällige Fertigkeit */
Spiel.playbooks.wiederholen = skill => Spiel.karriere.training(skill, {bevorzugt: "mini"});
