"use strict";
/* ---------- Kernaktionen der Labor-Ansicht (3.1.0, Aufgabe B3/3) ----------
   R12-Entscheid: Die Aktionen stehen in der rechten Leiste NUR ALS TEXT (Name + Tastenkürzel,
   keine buttons/links/inputs im .ansicht-Kasten); ausgeführt werden sie über das bestehende,
   bereits gezählte ⋯-Menü der Auftragszeile (Kopf „Aktionen", body-level, zählt nicht).
   Diese Datei ist die EINE Quelle für beide Darstellungen. */
UI.laborAktionen = (() => {
  function labor(){ try { return (typeof UI !== "undefined" && UI.labor) || null; } catch (e) { return null; } }
  /* Aktionen nutzen ausschließlich vorhandene Wege; fehlt ein Baustein, erklärt das eine Meldung. */
  const AKTIONEN = [
    {id: "konsole", name: "Konsole", taste: "C", hinweis: "Gerät wählen, dann Konsole öffnen",
      ausfuehren: () => { const l = labor(); const id = l && l.auswahl && l.auswahl.geraet; if (!id) { UI.toast("Wähle zuerst ein Gerät aus.", "info"); return; } l.konsole(id); }},
    {id: "messen", name: "Messen (Ping)", taste: "P", hinweis: "Erreichbarkeit von A nach B prüfen",
      ausfuehren: () => { const l = labor(); if (l && typeof l.werkzeug === "function") l.werkzeug("ping"); }},
    {id: "konfigurieren", name: "Konfigurieren", taste: "I", hinweis: "Inspektor am gewählten Gerät",
      ausfuehren: () => { const l = labor(); if (!l) return; if (typeof l.dock === "function") l.dock("inspektor"); if (typeof l.inspektor === "function") l.inspektor(true); }},
    {id: "akte", name: "Akte", taste: null, hinweis: "Dokumentieren und Verdacht festhalten (kein eigenes Tastenkürzel)",
      ausfuehren: () => { try { UI.akte && typeof UI.akte.freigeben === "function" ? UI.akte.freigeben(true) : UI.toast("Die Akte gehört zu einem laufenden Auftrag.", "info"); } catch (e) { console.error("Aktionen: Akte", e); } }},
    {id: "abnahme", name: "Abnahme", taste: null, hinweis: "Der Kunde prüft die Arbeit (Knopf in der Auftragszeile)",
      ausfuehren: () => { try { UI.spiel && typeof UI.spiel.abnahmeAnfordern === "function" ? UI.spiel.abnahmeAnfordern() : UI.toast("Die Abnahme gibt es nur bei laufendem Auftrag.", "info"); } catch (e) { console.error("Aktionen: Abnahme", e); } }},
  ];
  function liste(){ return AKTIONEN.map(a => ({id: a.id, name: a.name, taste: a.taste, hinweis: a.hinweis})); }
  function ausfuehren(id){
    const a = AKTIONEN.find(x => x.id === id);
    if (!a) return false;
    try { a.ausfuehren(); } catch (e) { console.error("Aktion " + id, e); return false; }
    return true;
  }
  /* Einträge für UI.menue (body-level Menü; kein neues Bedienelement in der Ansicht). */
  function menueEintraege(){
    return AKTIONEN.map(a => ({text: a.name + "…", sym: null, taste: a.taste || undefined, titel: a.hinweis, fn: () => ausfuehren(a.id)}));
  }
  return {liste, ausfuehren, menueEintraege};
})();
