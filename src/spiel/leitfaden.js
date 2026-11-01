"use strict";
/* ---------- Spiel: Analyse-Leitfaden (3.1.0, Variante B; task-123, Spec task-122) ----------
   Prozessmodell der vollständigen Handlung, verdichtet auf sechs Phasen. Diese Datei erkennt
   Fortschritt AUSSCHLIESSLICH aus echten Spielzuständen — keine Klick-/Zeitzählung, kein neuer
   Spielstand, keine Lösungen. Die Texte stehen ausschließlich in src/daten/leitfaden.js
   (verbindlich: Nachweise/3.0/3.1/DIAGNOSTIK.md, r-didaktik).

   VERTRAG (Lead trägt Architektur § 17/§ 21 nach):
     stand(inst) -> {pruefung:bool, fortschritt:0..1, aktuell:id|null,
                     schritte:[{id,titel,status:"erledigt"|"aktuell"|"offen",impuls:str|null}]}
     phase(inst) -> id|null · fortschritt(inst) -> 0..1 · naechsterSchritt(inst) -> {id,titel,text}|null
     pruefungAktiv() -> bool · zuruecksetzen(inst) -> {ok:true} · LUECKEN (dokumentierte Lücken)

   ERKENNUNG (Didaktik-Spec §1; Datei:Zeile in dieser Sitzung geprüft):
   1 auftrag-klaeren:        !!inst.geoeffnet                     (persistiert, ticket.js:48; st.aktiv ist nur Laufzeit :46)
   2 lage-schichten:         (inst.befehle||[]).length > 0        (PROXY laut Spec §6; Befehlslog akte.js:57-67)
   3 hypothese:              !!inst.verdacht                      (verdacht.js:52-58); ohne Injektor (verdacht.noetig false,
                                                                  :18-21) gilt der Schritt als erledigt (kein Zwang)
   4 messen:                 (inst.akte||[]).length > 0           (Beweiskarten akte.js:9-20, :29-54)
   5 eingreifen-pruefen:     Spiel.geaenderteGeraete(inst)>0      (Diff gegen Startnetz, szene.js:158-169) UND
                             Spiel.zieleStatus(inst).some(ok)     (ticket.js:106-111); ohne Injektor genügt ein erfülltes Ziel
                             (zusätzlich nach Abnahme: inst.zielErst, abnahme.js:41-43)
   6 dokumentieren-lernen:   inst.abnahmen>0 ODER inst.notiz ODER inst.antworten  (abnahme.js:41; arbeitsziele.js:51-54,68-78)
   Prüfungsmodus: Spiel.pruefung.aktiv() (pruefung.js:18) oder inst.quelle==="pruefung" → neutraler Status,
   impuls:null, naechsterSchritt null. Kein Sternabzug, keine Hilfe-/Lernbuchung, keine Rangfolge. */
Spiel.leitfaden = (() => {
  const daten = () => (typeof DATEN !== "undefined" && DATEN && DATEN.leitfaden) || {};
  const phasen = () => { const p = daten().phasen; return Array.isArray(p) ? p : []; };
  const pruefungAktiv = () => {
    try { return !!(Spiel.pruefung && typeof Spiel.pruefung.aktiv === "function" && Spiel.pruefung.aktiv()); }
    catch (e) { return false; }
  };
  const imPruefung = inst => !!(pruefungAktiv() || (inst && typeof inst === "object" && inst.quelle === "pruefung"));
  const laenge = x => Array.isArray(x) ? x.length : 0;
  const akten = inst => laenge(inst && inst.akte);
  const befehle = inst => laenge(inst && inst.befehle);
  const geaendert = inst => { try { return typeof Spiel.geaenderteGeraete === "function" ? (Spiel.geaenderteGeraete(inst) || []) : []; } catch (e) { return []; } };
  /* Verifikation: ein Ziel ist jetzt erfüllt — live geprüft oder in der letzten Abnahme belegt (inst.zielErst). */
  const verifiziert = inst => {
    try { const s = typeof Spiel.zieleStatus === "function" ? Spiel.zieleStatus(inst) : []; if (Array.isArray(s) && s.some(x => x && x.ok === true)) return true; } catch (e) { /* weiter */ }
    return !!(inst && Array.isArray(inst.zielErst) && inst.zielErst.some(x => typeof x === "number"));
  };
  const ohneInjektor = inst => { try { return !!(Spiel.verdacht && typeof Spiel.verdacht.noetig === "function" && !Spiel.verdacht.noetig(inst)); } catch (e) { return false; } };
  const dokumentiert = inst => !!(inst && ((Number(inst.abnahmen) || 0) > 0
    || (inst.notiz && String(inst.notiz).trim().length > 0)
    || Object.keys(inst.antworten || {}).length > 0));
  const erledigt = {
    "auftrag-klaeren": inst => !!(inst && inst.geoeffnet),
    "lage-schichten": inst => befehle(inst) > 0,
    "hypothese": inst => !!(inst && inst.verdacht) || ohneInjektor(inst),
    "messen": inst => akten(inst) > 0,
    "eingreifen-pruefen": inst => ohneInjektor(inst) ? verifiziert(inst) : (geaendert(inst).length > 0 && verifiziert(inst)),
    "dokumentieren-lernen": dokumentiert,
  };
  /* Dokumentierte Lücken (Spec §6) — ehrlich sichtbar für Panel/Review. */
  const LUECKEN = [{
    schritt: "lage-schichten",
    spec: "DIAGNOSTIK.md §6",
    quelle: "kein persistiertes 'Gerät angesehen'/'Inspektor geöffnet' (Suche gesehen|besichtigt|angesehen|besucht + Inspektor-Events = 0)",
    proxy: "(inst.befehle||[]).length > 0 — Befehlslog src/spiel/akte.js:57-67",
    zukunft: "optionales inst.gesehen aus dem UI-Bus ist 3.2-Idee; Lead-Entscheid 3.1.0: keine neuen Fortschrittsspeicher",
  }];
  const impulseVon = p => Array.isArray(p && p.impulse) ? p.impulse.filter(x => typeof x === "string" && x.trim()) : [];
  const impulsText = (p, i) => { const l = impulseVon(p); return l[i] || l[0] || ""; };
  function stand(inst){
    const ps = phasen();
    const im = imPruefung(inst);
    const getan = ps.map(p => { try { return !!(erledigt[p.id] && erledigt[p.id](inst)); } catch (e) { return false; } });
    const ersterOffen = getan.indexOf(false);
    const fertig = getan.filter(Boolean).length;
    const fortschritt = ps.length ? Math.max(0, Math.min(1, fertig / ps.length)) : 0;
    const schritte = ps.map((p, i) => ({
      id: p.id, titel: p.titel,
      status: getan[i] ? "erledigt" : (i === ersterOffen ? "aktuell" : "offen"),
      /* Prüfung: nur neutraler Status, keine Impulse (Spec §3). Sonst trägt NUR der aktuelle
         Schritt den Panel-Impuls (impulse[0]); alle anderen null (Spec-Form str|null, P3). */
      impuls: (!im && !getan[i] && i === ersterOffen) ? impulsText(p, 0) : null,
    }));
    /* In der Prüfung nur neutraler Status: kein aktueller Schritt (Spec §3). */
    return {pruefung: im, fortschritt, aktuell: (!im && ersterOffen >= 0) ? ps[ersterOffen].id : null, schritte};
  }
  function naechsterSchritt(inst){
    if (imPruefung(inst)) return null;
    const st = stand(inst);
    if (!st.aktuell) return null;
    const p = phasen().find(x => x.id === st.aktuell) || {};
    /* Der zweite Spec-Impuls ist kein toter Inhalt: der „nächste Schritt" nutzt impulse[1] (P2). */
    return {id: p.id || st.aktuell, titel: p.titel || st.aktuell, text: impulsText(p, 1)};
  }
  const phase = inst => stand(inst).aktuell;
  const fortschritt = inst => stand(inst).fortschritt;
  /* Kein eigener Fortschritt gespeichert: zuruecksetzen ist ein No-op (entfernt höchstens eine Altlast). */
  function zuruecksetzen(inst){ if (inst && typeof inst === "object" && "leitfaden" in inst) delete inst.leitfaden; return {ok: true}; }
  return {stand, phase, fortschritt, naechsterSchritt, pruefungAktiv, zuruecksetzen, LUECKEN};
})();
