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

/* ---------- Baustein F: Bildungsstand in der Begrüßung (Vertrag § 1, § 2) ----------
   Die vier Stufen stehen IN der bestehenden Begrüßungskarte (`.sp-einstieg-start`, Station 1 des
   sanften Onboardings), nicht in einer zweiten Karte daneben: eine Wahl, ein Klick, danach geht der
   Einstieg wie vorher weiter. Danach richtet sich die Anweisungszeile der ersten Stunde nach der
   Stufe: azubi bekommt den WEG genannt (nicht die Lösung), azubi-plus denselben Weg knapper,
   geselle und meister keine ungefragte Anweisung.

   Angeschlossen wird ohne fremde Datei: `#labor-auftrag` entsteht an genau einer Stelle
   (`UI.labor.auftragNeu`, src/ui/editor.js). Der Start umhüllt sie und zieht nach jedem Zeichnen
   nach – die Wahl und die Zeile werden also wirklich gezeichnet, nicht nur berechnet. */
UI.einstiegStufe = (() => {
  const T = () => Spiel.EINSTIEG_TEXTE;
  /* Lesen und Schreiben laufen ausschließlich über Spiel.einstieg bzw. Spiel.stufe (Baustein A/F). */
  const noetig = () => { try { return !!Spiel.einstieg.stufeNoetig(); } catch (e) { return false; } };
  const aktuell = () => { try { return Spiel.einstiegStufe(); } catch (e) { return "azubi"; } };
  const saetze = () => { try { return Spiel.einstieg.stufen(); } catch (e) { return []; } };

  /* Die Wahlfläche: die vier Stufen als Knöpfe, darunter der Satz der gewählten Stufe.
     Zeigen (Maus/Tastatur) erklärt, Klicken setzt – beides ohne die Karte zu schließen. */
  function karte(){
    const liste = saetze();
    if (!liste.length) return null;
    const jetzt = aktuell();
    const zeile = h("p", {class: "sp-stufe-satz"}, Spiel.einstieg.stufeSatz(jetzt));
    const zeigen = id => { zeile.textContent = Spiel.einstieg.stufeSatz(id); };
    const knopf = d => h("button", {type: "button", role: "radio", class: "sp-stufe-knopf" + (d.id === jetzt ? " an" : ""),
      "aria-checked": String(d.id === jetzt), "data-stufe": d.id, title: d.name + " – " + d.satz,
      onclick: () => waehlen(d.id), onmouseenter: () => zeigen(d.id), onfocus: () => zeigen(d.id)}, d.kurz);
    const gruppe = h("div", {class: "sp-stufe-wahl", role: "radiogroup", "aria-label": "Bildungsstand"}, liste.map(knopf));
    const kasten = h("div", {class: "sp-stufe", "data-stufe": jetzt},
      h("p", {class: "sp-stufe-frage"}, T().STUFE_FRAGE), gruppe, zeile);
    function waehlen(id){
      const gesetzt = Spiel.einstieg.stufeWaehlen(id);
      for (const b of gruppe.querySelectorAll(".sp-stufe-knopf")) {
        const an = b.getAttribute("data-stufe") === gesetzt;
        b.classList.toggle("an", an);
        b.setAttribute("aria-checked", String(an));
      }
      zeigen(gesetzt);
      kasten.setAttribute("data-stufe", gesetzt);
    }
    return kasten;
  }

  /* Die Wahl in die vorhandene Begrüßungskarte hängen – nur dort, nur solange sie steht, nur einmal.
     Sie kommt VOR den Knopfblock: stand sie dahinter (bis 07.10.2026 `ziel.append(k)`), klickte ein
     Azubi den auffälligen blauen „Zeig mir den ersten Auftrag" und hatte die Wahl nie gesehen — die
     Karte kommt nicht wieder. Gemessen im Review „Auffindbarkeit", Befund 1 (P1). */
  function einhaengen(wurzel){
    const w = wurzel || (typeof document !== "undefined" ? document : null);
    if (!w || !noetig()) return false;
    const ziel = w.querySelector(".sp-einstieg-start");
    if (!ziel || ziel.querySelector(".sp-stufe")) return false;
    const k = karte();
    if (!k) return false;
    const knoepfe = ziel.querySelector(".sp-einstieg-knoepfe");
    if (knoepfe && knoepfe.parentNode === ziel) ziel.insertBefore(k, knoepfe);
    else ziel.append(k);                       /* Rückfall: Karte ohne Knopfblock (älterer Stand) */
    return true;
  }

  /* Die Anweisungszeile der ersten Stunde nach der Stufe richten (Station 2; sie kommt aus ui/spiel.js). */
  function anweisungRichten(wurzel){
    const w = wurzel || (typeof document !== "undefined" ? document : null);
    if (!w) return false;
    const coach = w.querySelector('.sp-coach[data-hinweisquelle="coach"]');
    if (!coach) return false;
    /* meister: keine ungefragte Anweisung – jeder Coach-Schritt wäre eine. */
    if (aktuell() === "meister") { coach.hidden = true; return true; }
    const blase = coach.querySelector(".sp-blase");
    const text = blase ? String(blase.textContent || "") : "";
    if (text !== T().HINWEIS) return false;               /* ein späterer Coach-Schritt – unberührt */
    const a = Spiel.einstieg.anweisung({id: Spiel.EINSTIEG_TICKET});
    if (!a) { coach.hidden = true; return true; }         /* geselle: erst nach einem Fehler */
    if (a.text !== text) blase.textContent = a.text;      /* azubi-plus: derselbe Weg, knapper */
    return true;
  }

  function nachziehen(wurzel){
    let n = 0;
    try { if (einhaengen(wurzel)) n++; } catch (e) { console.error("Stufenwahl", e); }
    try { if (anweisungRichten(wurzel)) n++; } catch (e) { console.error("Anweisungszeile", e); }
    return n;
  }

  /* Der Anschluss an den echten Weg: #labor-auftrag wird nur über UI.labor.auftragNeu gefüllt. */
  function einrichten(){
    const labor = UI.labor;
    if (!labor || typeof labor.auftragNeu !== "function" || labor.auftragNeu.__einstiegStufe) return false;
    const alt = labor.auftragNeu;
    const neu = function(){ const r = alt.apply(this, arguments); nachziehen(); return r; };
    neu.__einstiegStufe = true;
    labor.auftragNeu = neu;
    nachziehen();
    return true;
  }

  return {karte, einhaengen, anweisungRichten, nachziehen, einrichten};
})();

/* Beim Start einhängen – VOR „ui-bereit“: dort öffnet src/ui/spiel.js den ersten Auftrag samt
   Begrüßungskarte; danach wäre die Wahl im ersten Bild nicht dabei (Lehre aus dem Bau P7). */
(UI.startHaken ||= []).push(() => UI.einstiegStufe.einrichten());

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => UI.starten());
  else UI.starten();
}
