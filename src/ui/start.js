"use strict";
/* ---------- Start (wird als letzte Datei geladen) ----------
   UI.starten(): Schreiber setzen, Thema anwenden, Spiel-Ansichten anmelden (UI.startHaken), Vollansicht mit Labor öffnen.
   Solange es kein Spiel gibt, zeigt das Labor das „Freie Labor“ (Sandbox) mit DATEN.beispiele.salon(),
   gespeichert unter store "sandbox" nach jeder Änderung. Das Spiel ruft später UI.labor.laden(netz, {titel, verlauf, auftrag}). */
UI.sandbox = (() => {
  let netz = null, verlauf = null;
  const gueltig = n => n && typeof n === "object" && n.geraete && typeof n.geraete === "object" && Array.isArray(n.kabel);
  function holen(){
    const s = store.get("sandbox", null);
    let n = s && gueltig(s.netz) ? s.netz : null;
    if (n) { n.zustand ||= {_uhr: 0}; n.v ||= 1; }
    return n || DATEN.beispiele.salon();
  }
  function auftrag(el){
    const zahl = Object.keys(netz?.geraete || {}).length;
    el.append(h("div", {class: "auftrag-sandbox"},
      h("div", {class: "as-sym"}, UI.symbol("sandbox", 22)),
      h("div", {class: "as-text"},
        h("strong", {}, "Freies Labor"),
        h("span", {}, `Sandbox · ${zahl} ${zahl === 1 ? "Gerät" : "Geräte"} · Probier alles aus – Rückgängig (Strg+Z) macht jeden Schritt wieder gut.`)),
      h("button", {type: "button", class: "knopf", title: "Salon-Netz neu laden (lässt sich rückgängig machen)", onclick: zuruecksetzen}, UI.symbol("neustart", 16), "Sandbox zurücksetzen")));
  }
  function laden(){
    netz = holen();
    verlauf = Modell.verlauf(netz);
    UI.labor.laden(netz, {titel: "Freies Labor", verlauf, auftrag, sandbox: true});
  }
  function zuruecksetzen(){
    if (!netz || !verlauf) return;
    const frisch = DATEN.beispiele.salon();
    verlauf.aendern("Sandbox zurückgesetzt", n => { for (const k of Object.keys(n)) delete n[k]; Object.assign(n, frisch); });
    UI.labor.einpassen();
    UI.toast("Die Sandbox ist wieder das Salon-Netz.", "info", {aktion: {text: "Rückgängig", fn: () => UI.labor.rueckgaengig()}});
  }
  function speichern(d){
    if (!netz || !d || d.netz !== netz) return;
    store.set("sandbox", {v: 1, netz});
    if (UI.labor.netz === netz) UI.labor.auftragNeu?.();
  }
  return {laden, zuruecksetzen, speichern, get netz(){ return netz; }};
})();

UI.starten = function(){
  if (UI.starten.fertig) return;
  UI.starten.fertig = true;
  store.schreiberSetzen(d => Plattform.speichern(d));
  UI.app.themaAnwenden();
  for (const fn of UI.startHaken || []) { try { fn(); } catch (e) { console.error("Start-Haken", e); } }

  /* Kopfzeile: Werte aus dem Spielstand, falls vorhanden (das Spiel setzt sie später selbst über UI.app.status) */
  const st = store.get("labor", null);
  UI.app.status({euro: st?.euro ?? 0, ruf: st?.ruf ?? 0, stufe: st?.stufe ?? 1, offen: Array.isArray(st?.postfach) ? st.postfach.length : 0});

  UI.sandbox.laden();
  Bus.an("netz-geaendert", d => UI.sandbox.speichern(d));

  UI.modus("voll");
  if (store.meldung) UI.toast(store.meldung, "warn", {titel: "Spielstand", dauer: 9000});

  /* Speicherfehler melden statt schlucken (volles localStorage = QuotaExceededError). Einmal je
     Fehlerart, danach erst wieder nach einem geglückten Schreibvorgang. Der Stand bleibt dabei
     „schmutzig“ und geht beim nächsten Versuch mit (src/kern/basis.js, store.sofort). */
  let letzterFehler = null;
  Bus.an("speicher-fehler", f => {
    const art = (f && f.name) || "Fehler";
    if (art === letzterFehler) return;
    letzterFehler = art;
    UI.toast(`Der Spielstand konnte nicht gesichert werden (${art}). Bis es wieder geht, ist der Fortschritt beim Schließen verloren.`, "fehler", {titel: "Nicht gesichert", dauer: 15000});
  });
  Bus.an("speicher-stand", s => { if (s.art !== "fehler") letzterFehler = null; });

  /* Zwei Fenster auf demselben Spielstand: beide teilen sich localStorage, es gewinnt der letzte
     Schreiber — der andere Fortschritt ist dann still weg (gemessen 06.10.2026: A 100,11 € →
     B liest 100,11 €, schreibt 200,22 € → A speichert seine alten 100,11 €, B ist verloren).
     Der storage-Hörer läuft nur im NICHT schreibenden Fenster — dort ist die Warnung richtig.
     Höchstens eine Warnung je Minute: sonst bliebe sie bei jedem Speichern des anderen Fensters
     stehen (das Spiel hält ohnehin nur einen Toast gleichzeitig). */
  let zweiFensterBis = 0;
  addEventListener("storage", e => {
    if (e.key !== "netzwerk-labor" || !e.newValue) return;
    if (Date.now() < zweiFensterBis) return;
    zweiFensterBis = Date.now() + 60000;
    UI.toast("Ein zweites Fenster spielt denselben Spielstand. Es gewinnt, wer zuletzt schreibt — bitte nur in einem Fenster spielen.", "warn",
      {titel: "Zwei Fenster", dauer: 14000, id: "zweitab"});
  });

  /* sofort schreiben, wenn das Fenster geht — store.sofort() schreibt augenblicklich, nicht erst
     nach der Entprellung (gemessen: Verstecken der Seite → 1 Schreibvorgang im selben Moment). */
  const jetztSchreiben = () => { try { Promise.resolve(store.sofort()).catch(e => console.warn("Speichern", e)); } catch (e) { console.warn(e); } };
  addEventListener("pagehide", jetztSchreiben);
  addEventListener("beforeunload", jetztSchreiben);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") jetztSchreiben(); });

  /* Desktop: Tray-Klick und Hotkey blenden die Leiste ein/aus, ein zweiter Start holt sie nach vorn */
  const umschalten = () => {
    const m = UI.modus();
    if (m === "leiste" && Plattform.kann("tray").ja) UI.modus("tray");
    else if (m !== "voll") UI.modus("leiste");
    else UI.modus("leiste");
  };
  Plattform.an("tray-klick", umschalten);
  Plattform.an("hotkey", umschalten);
  Plattform.an("zweiter-start", () => { if (UI.modus() === "tray") UI.modus("leiste"); try { Plattform.fenster.zeigen(); } catch (e) { console.warn(e); } });
  Plattform.an("oeffnen", () => UI.modus("voll"));
  Bus.senden("ui-bereit", {});
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => UI.starten());
  else UI.starten();
}
