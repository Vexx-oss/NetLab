"use strict";
/* ---------- Spiel: Übergabe an den nächsten Azubi (ein Rechner, viele Azubis) ----------
   Gebaut 09.10.2026 (Fahrplan 1.3/2.0, Schritt 0).

   WARUM: In einem Computerraum wechseln die Azubis den Rechner. Vorher steckte der zweite
   Azubi im offenen Auftrag des ersten — `src/ui/spiel.js:aktiveLaden()` öffnet beim Start
   `Spiel.aktiveInstanz()`, und im Spiel gab es keinen Weg, das loszuwerden. Damit war das
   Spiel ab der zweiten Unterrichtsstunde unbrauchbar.

   WAS HIER STEHT: `Spiel.uebergabe({lernstandBehalten})` — EINE Stelle, die den Rechner an
   den nächsten Azubi übergibt. Kein DOM (Schichtregel § 7); die Oberfläche ruft nur.

   WAS BLEIBT: nur, was NICHT im Spielstand steht — die Einstellungen (`store "einst"`) und die
   rollierende Sicherung (`labor-sicherung`). Der Spielstand selbst wird ersetzt: Geld, Ruf,
   erledigte Tickets, Fehlerdex, Buch, offener Auftrag. Genau das sagt auch der Dialog der
   Oberfläche an („Geht verloren: Geld, Ruf, Aufträge, erledigte Tickets, Fehlerdex",
   `src/ui/uebergabe.js:53`); nachgemessen wird es in tests/spiel-uebergabe.test.js.
   Der LERNSTAND (`store "lern"`, geführt von `fremd/lernmotor.js`) bleibt STANDARDMÄSSIG
   ERHALTEN, denn er gehört dem Lernmotor, nicht dem Spielstand (`Spiel.neu` seit 1.0:
   „Lernstand bleibt, der gehört dem Lernmotor"). `lernstandBehalten: false` löscht ihn — die
   Entscheidung der Lehrkraft, weil der Lernstand am Rechner hängt und nicht an der Person.

   Reihenfolge, die zählt (gemessen 09.10.2026, tests/spiel-uebergabe.test.js): Bei `false` wird
   `L.reset()` gerufen, BEVOR `Spiel.laden()` läuft. `Spiel.laden` füllt das Postfach auf
   (`postfachAuffuellen`, zustand.js:164) und greift dabei auf den Lernstand zu (`L.faelligeIds`,
   `L.versucht` in postfach.js:199-200): Stünde das Löschen danach, wäre der neue Rechner aus den
   fälligen Fertigkeiten des VORGÄNGERS gefüllt. Der Test misst das mit einem Spion auf
   `Spiel.postfachAuffuellen` und stellt in einer Fehlprobe sicher, dass er die vertauschte
   Reihenfolge wirklich sieht. Ein direktes Löschen des Speicherschlüssels wäre die andere Falle:
   `L.reset()` schreibt über den Motor selbst (fremd/lernmotor.js:109).

   `Spiel._lz` (Laufzeit je Instanz: Verlauf, Startnetz, letzte Arbeit) wird hier NICHT eigens
   geleert — das tun `Spiel.neu` (zustand.js:178) und `Spiel.laden` (zustand.js:161) schon. Die
   frühere Zeile war doppelt und ist gestrichen. Die WIRKUNG hält der Test trotzdem fest, weil
   die iid-Zählung nach der Übergabe wieder vorn beginnt (gemessen: sie steht danach bei 3, das
   frische Postfach vergibt i1 und i2) — dieselben iids kommen also erneut vor. Ohne Leeren
   hinge an einer wiederverwendeten iid das Startnetz des Vorgängers: `Spiel.startNetzVon`
   glaubt `_lz` blind (ticket.js:32-36). Auch diese Fehlprobe steht im Test. */
Spiel.uebergabe = function({lernstandBehalten = true} = {}){
  const lern = typeof L !== "undefined" && L && typeof L.reset === "function";
  if (!lernstandBehalten && !lern) {
    /* Ehrlich scheitern statt stumm den alten Lernstand weiterführen: ohne Lernmotor wäre die
       Zusage „Lernstand gelöscht" nicht einlösbar. Vorher wird NICHTS angefasst — auch das prüft
       ein Testfall (der offene Auftrag bleibt offen, das Geld bleibt da). */
    return {ok: false, grund: "Der Lernstand lässt sich hier nicht zurücksetzen (kein Lernmotor geladen)."};
  }

  const vorher = {euro: Spiel.st.euro, ruf: Spiel.st.ruf, stufe: Spiel.st.stufe, erledigt: Spiel.st.erledigt.length};
  if (!lernstandBehalten) L.reset();          /* VOR Spiel.laden — siehe Kopfkommentar */
  Spiel.neu();                                 /* leerer Stand, Laden, Migration, Postfach füllen, melden */
  Spiel.st.uebergabe = {t: jetzt(), lernstandBehalten: !!lernstandBehalten};
  Spiel.speichern();
  Spiel.melden("uebergabe", {lernstandBehalten: !!lernstandBehalten, vorher});
  return {ok: true, lernstandBehalten: !!lernstandBehalten, vorher,
          nachher: {euro: Spiel.st.euro, ruf: Spiel.st.ruf, stufe: Spiel.st.stufe, erledigt: Spiel.st.erledigt.length,
                    aktiv: Spiel.st.aktiv, lz: Object.keys(Spiel._lz).length}};
};

/* Die letzte Übergabe dieses Rechners (oder null). Kleine Auskunft für die Oberfläche —
   bewusst kein zweiter Speicherort: sie steht IM Spielstand und geht mit ihm. */
Spiel.uebergabeLetzte = function(){
  const u = Spiel.st && Spiel.st.uebergabe;
  return u && u.t ? u : null;
};
