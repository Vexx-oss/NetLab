"use strict";
/* ---------- UI: Klassenraum (Lehrkraft) und Mitarbeit (Azubi) · Bereich B ----------
   Verbindlich: docs/entwicklung/Klassenraum/B – Oberfläche und Ablauf.md
     § 1.2 Anmeldung in EINEM Start-Haken       § 2.1/2.2 DOM und Klassen (34, Präfix kl-)
     § 3   Texte wörtlich                       § 4   Startseiten-Zeile (Haken auf Bus „ansicht“)
     § 6.1 Öffnungsweg des Auftrags             § 6.5 Klassenraum-Abdruck (geladenes Netz!)
     § 7   Ergebnis-Code als Toast              § 8   ein textarea, Block oder einzelne Codes
     § 9   Ampel (oberer Median)                § 10  Export/Import über einen Knopf „Datei…“
     § 11  Einstellungen: ehrlicher Hinweis zum Klassenraum-Server (3.1, VIS-04; kein Schalter)

   DREI FESTLEGUNGEN DER LEITUNG, DIE HIER GELTEN (sie weichen von Entwurf D ab):
     · Wo B und D sich widersprechen, gilt B (Knopf „Code anzeigen“, EIN textarea, „Datei…“).
     · Die Startseiten-Zeile kommt aus DIESER Datei über den Bus-Haken „ansicht“ – `src/ui/hub.js`
       wird NICHT angefasst (B § 4.1 nennt den Eingriff selbst „Fremdeingriff“; Entscheidung L5).
     · Der Ergebnis-Code hängt am Bus-Kanal „klassenraum“ (src/spiel/klassenraum.js meldet ihn).
       Das Ergebnis-Overlay in `src/ui/spiel.js` bleibt unberührt (B § 7.2).

   KEINE BEWERTUNG (Nutzerentscheidung 09.10.2026): keine Punkte, keine Rangliste, kein Vergleich
   zwischen Azubis. Die Ampel zählt Plätze und zeigt Dauern – sie benotet niemanden.
   Der Bildungsstand bleibt unangetastet (E3): hier wird `Spiel.stufe` nie gesetzt.

   GRÜN OHNE WIRKUNG ZÄHLT NICHT (AGENTS.md): beide Ansichten melden sich im echten Start-Haken an,
   die Startseiten-Zeile hängt am echten Bus-Ereignis, der Ergebnis-Toast am echten Abnahmeweg. */
UI.klassenraum = (() => {
  const ABDRUCK_LEER = "— — — — —";
  const START_FEHLER = "Kein Auftrag gefunden – frag deine Lehrkraft nach dem Code.";
  const START_HINWEIS = "Auftragscode eintippen – der Auftrag öffnet sich wie aus dem Postfach.";

  /* Die API defensiv lesen: fehlt der Codec (Bereich A) noch, bleibt die Fläche ruhig statt zu werfen. */
  const api = () => { try { return (typeof Spiel !== "undefined" && Spiel.klassenraum) || null; } catch (e) { return null; } };
  const kann = n => { const a = api(); return !!(a && typeof a[n] === "function"); };
  const ruf = (n, ...args) => { try { const a = api(); return a && typeof a[n] === "function" ? a[n](...args) : null; } catch (e) { console.error("Klassenraum", n, e); return null; } };

  /* ---------------- reine Helfer (kein DOM, headless prüfbar) ---------------- */

  /* Dauer als M:SS – Haus-Vorlage src/spiel/tagebuch.js:52. Eingabe sind SEKUNDEN (A liefert dauerS). */
  function dauerText(s){
    const n = Math.max(0, Math.round(Number(s) || 0));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  }
  /* Halbe Sterne als Zeichen: 4,5 → ★★★★½ (A liefert halbe Sterne 0..10). */
  function sterneText(halbe){
    const n = Math.max(0, Math.min(10, Math.round(Number(halbe) || 0)));
    return "★".repeat(Math.floor(n / 2)) + (n % 2 ? "½" : "") || "–";
  }
  /* Block in Stücke zerlegen (B § 8.2): Zeile und Stück – die Zeilennummer ist die Fehleradresse.
     Bindestriche sind KEINE Trenner (sie gehören zum gedruckten Code); normalisiert wird in A. */
  function zerlegen(block){
    const aus = [];
    String(block == null ? "" : block).replace(/\r/g, "").split("\n").forEach((z, i) => {
      for (const stueck of z.split(/[\s,;]+/).filter(Boolean)) aus.push({zeile: i + 1, stueck});
    });
    return aus;
  }
  /* Der HILFECODE (3.0, Säule 5, Weg A; Architektur § 12.5): gedruckt `H-XXXX-XX` — neun Zeichen
     (`H-` + 4 Nutzzeichen + `-` + 2 Prüfzeichen). Er ist KEIN Ergebnis — er sagt, WO jemand hängt.
     Entschieden wird am PRÄFIX, und zwar VOR dem Eintragen: `H…` geht immer den Hilfeweg
     (ein Ergebnis-Code beginnt mit `E`, ein Auftragscode mit `NL`). So bekommt die Lehrkraft auch
     bei einem abgeschnittenen oder verwechselten Code die Erklärung des Codec statt nur „unlesbar"
     — und ein H-Code kann gar nicht erst in den Ergebnissatz laufen. */
  const istHilfecode = s => /^H/i.test(String(s == null ? "" : s).trim());
  /* Die Ampel (B § 9): fertig = belegte Plätze, offen = plaetze − fertig, Median = OBERER Median
     der gültigen Dauern > 0, auf ganze Sekunden. Ohne eingestellte Platzzahl bleibt sie gelb und
     sagt das – sie erfindet keine Zahl. Rot ist im Normalbetrieb aus (§ 9.3).

     ZWEITE ZEILE: DIE DIAGNOSE OHNE BEWERTUNG (3.0, Säule 5, Weg A). Die Lehrkraft fragt im
     Unterricht nicht „wie gut ist einer?", sondern „wo steht die Klasse?" — und die Antwort sind
     AUSSCHLIESSLICH anonyme Zahlen: wie viele Plätze offen sind (mit der Klassengröße als Nenner),
     wie viele Abgaben in den letzten fünf Minuten kamen und wie frisch die letzte ist.
     KEIN Name, KEIN Rang, KEINE Sternesumme je Person, KEIN Vergleich zwischen Azubis; der Median
     steht schon in der Ampel und wird hier NICHT wiederholt. Alles kommt aus der lokalen Sitzung
     (`store "klassenraum"`) — kein Server, kein Netz. Die Uhr kommt als Zahl herein (`jetztMs`),
     damit die Rechnung prüfbar bleibt: ohne Uhr wird keine Zeit behauptet. */
  function ampel(sitzung, jetztMs){
    const s = sitzung || {};
    const werte = Object.keys(s.ergebnisse || {}).map(k => s.ergebnisse[k]).filter(x => x && typeof x === "object");
    const plaetze = Math.max(0, Number(s.plaetze) || 0);
    const fertig = werte.length;
    const ohne = werte.filter(x => !(Number(x.platz) >= 1) || (plaetze > 0 && Number(x.platz) > plaetze)).length;
    const dauern = werte.map(x => x.dauerS).filter(d => typeof d === "number" && isFinite(d) && d > 0).sort((a, b) => a - b);
    const median = dauern.length ? Math.round(dauern[Math.floor(dauern.length / 2)]) : null;
    const farbe = !fertig ? "" : (plaetze > 0 && fertig >= plaetze && !ohne) ? "kl-gruen" : "kl-gelb";
    const teile = [];
    if (!fertig) teile.push("noch keine Ergebnisse");
    else {
      teile.push(`fertig ${fertig}`);
      teile.push(plaetze > 0 ? `offen ${Math.max(0, plaetze - fertig)}` : "Plätze nicht eingestellt");
      teile.push(`Median ${median == null ? "–" : dauerText(median)}`);
    }
    if (ohne) teile.push(ohne === 1 ? "1 Ergebnis ohne gültigen Platz" : `${ohne} Ergebnisse ohne gültigen Platz`);
    const zeilen = werte.slice().sort((a, b) => (Number(a.platz) || 0) - (Number(b.platz) || 0)).map(x => ({
      platz: Number(x.platz) || 0,
      sterne: Math.round((Number(x.sterne) || 0) * 2),
      dauerS: typeof x.dauerS === "number" && x.dauerS > 0 ? x.dauerS : null,
      versuche: Math.max(0, Number(x.versuche) || 0),
    }));
    return Object.assign({farbe, summe: "Ampel: " + teile.join(" · "), fertig, plaetze,
      offen: plaetze > 0 ? Math.max(0, plaetze - fertig) : null, median, zeilen},
      fortschrittZahlen(werte, plaetze, fertig, jetztMs));
  }

  /* Die anonymen Diagnosezahlen — reine Rechnung, keine Namen weit und breit. */
  function fortschrittZahlen(werte, plaetze, fertig, jetztMs){
    const FENSTER_MS = 5 * 60 * 1000;
    const offene = Math.max(0, plaetze - fertig);
    const mitZeit = werte.map(x => x.zeit).filter(t => typeof t === "number" && isFinite(t));
    const uhr = typeof jetztMs === "number" && isFinite(jetztMs);
    const frische = uhr ? mitZeit.filter(t => jetztMs - t >= 0 && jetztMs - t <= FENSTER_MS).length : null;
    const letzteSek = uhr && mitZeit.length ? Math.max(0, Math.round((jetztMs - Math.max(...mitZeit)) / 1000)) : null;
    const zeitText = s => s < 60 ? "gerade eben" : s < 120 ? "vor 1 Minute" : `vor ${Math.round(s / 60)} Minuten`;
    const teile = [];
    if (plaetze > 0) teile.push(`${offene} von ${plaetze} offen`);
    else teile.push(fertig ? `${fertig} ${fertig === 1 ? "Abgabe" : "Abgaben"}` : "noch keine Abgaben");
    if (frische != null) teile.push(frische === 1 ? "1 Abgabe in den letzten 5 Minuten" : `${frische} Abgaben in den letzten 5 Minuten`);
    if (letzteSek != null) teile.push(`letzte Abgabe ${zeitText(letzteSek)}`);
    return {offenVon: plaetze > 0 ? {offen: offene, plaetze} : null, frische, letzteSek,
      fortschritt: "Fortschritt: " + teile.join(" · ")};
  }

  /* ---------------- gemeinsame Bausteine ---------------- */
  const hinweisZeile = (klasse, text) => h("span", {class: klasse}, text);
  /* Das Feld markieren, ohne es abzuweisen: aria-invalid + Farbe (klassenraum.css), Inhalt bleibt stehen. */
  const markieren = (feld, an) => { if (feld) feld.setAttribute("aria-invalid", an ? "true" : "false"); };

  /* Der Abdruck kommt aus dem TATSÄCHLICH geladenen Netz (B § 6.5), nie aus dem Code. */
  function abdruck(){
    const inst = UI.spiel?.inst;
    if (!kann("netzkennwert") || !inst || !inst.netz) return null;
    return ruf("netzkennwert", inst.netz) || null;
  }
  /* Die laufende Sitzung (tiefe Kopie) oder null. */
  const sitzungJetzt = () => ruf("sitzung");

  /* ================================================================ Lehrkraft */
  const L = {};       /* die veränderlichen Behälter der Ansicht */

  function lehrerZeigen(c){
    /* KLR-03 (§ 12.8): Der 6-Bit-Codec adressiert 58 der 76 Handtickets. Nur diese sind anwählbar –
       sonst scheitert eine von vier Optionen erst nach dem Klick. Quelle ist die Codec-Tabelle selbst. */
    const alle = (typeof Spiel.ticketReihe === "function" ? Spiel.ticketReihe() : []);
    const tab = kann("tabellen") ? ruf("tabellen") : null;
    const ids = tab && tab.auftraege && Array.isArray(tab.auftraege.ids) ? tab.auftraege.ids : null;
    const auftraege = (ids ? ids.map(id => alle.find(t => t.id === id)).filter(Boolean) : alle)
      .map(t => h("option", {value: "id:" + t.id}, t.titel || t.id));
    const formatgrenze = ids
      ? "Formatgrenze: " + ids.length + " von " + alle.length + " Aufträgen sind per Klassenraum-Code adressierbar (6 Bit); der Formatwechsel kommt erst mit 3.1."
      : "";
    const fertigkeiten = (kann("tauglicheFertigkeiten") ? ruf("tauglicheFertigkeiten") : []) || [];
    L.auftrag = h("select", {class: "kl-feld", "aria-label": "Auftrag"});
    L.auftrag.append(...auftraege, ...(fertigkeiten.length
      ? [h("optgroup", {label: "Übungen (erzeugt)"}, fertigkeiten.map(f => h("option", {value: "skill:" + f.skill}, f.skill)))] : []));
    L.code = h("span", {class: "kl-code"}, ABDRUCK_LEER);
    L.abdruck = h("span", {class: "kl-code"}, ABDRUCK_LEER);
    L.hinweis = h("div", {class: "kl-block"}, hinweisZeile("kl-hinweis", ""));
    L.lampe = h("span", {class: "kl-lampe"});
    L.summe = hinweisZeile("kl-detail", "");
    L.fortschritt = hinweisZeile("kl-detail", "");
    L.diagnose = hinweisZeile("kl-detail", "");
    L.uebersicht = hinweisZeile("kl-detail", "");
    L.tafel = h("div", {class: "kl-tafel"});
    L.codes = h("textarea", {class: "kl-feld kl-breit", rows: "6", "aria-label": "Ergebnis-Codes",
      placeholder: "Einen Code je Zeile oder alles auf einmal einfügen.",
      onkeydown: e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ergebnisseEintragen(); } }});
    c.replaceChildren(h("div", {class: "kl-lehrer"},
      h("div", {class: "kl-spalte"},
        h("header", {class: "kl-kopf"}, h("h2", {}, "Klassenraum"),
          h("p", {class: "kl-klein"}, "Auftrag ansagen – jedes Gerät baut denselben Auftrag.")),
        h("div", {class: "kl-werkzeug"},
          hinweisZeile("kl-etikett", "Auftrag"), L.auftrag,
          h("button", {type: "button", class: "knopf knopf-haupt kl-knopf", onclick: codeAnzeigen}, "Code anzeigen")),
        formatgrenze ? h("div", {class: "kl-block"}, hinweisZeile("kl-detail", formatgrenze)) : null,
        h("div", {class: "kl-karte"},
          hinweisZeile("kl-etikett", "Auftragscode für die Klasse"),
          h("div", {class: "kl-gross"}, L.code),
          h("div", {class: "kl-block"}, hinweisZeile("kl-detail", "Der Code ist die Ansage: jedes Gerät baut denselben Fall."),
            h("button", {type: "button", class: "knopf kl-knopf", onclick: codeKopieren}, "Code kopieren")),
          /* Der Abdruck ist der des EIGENEN Labors: D verlangt ausdrücklich das TATSÄCHLICH
             GELADENE Netz, nicht den Code. Gemessen im Vorführlauf am 10.10.2026: die Lehrkraft
             zeigte 2S8HS2, die zwei Azubi-Geräte desselben angesagten Auftrags 3U9JGE — dieselbe
             Zeile, zwei verschiedene Netze. Deshalb sagt die Beschriftung, WESSEN Netz hier steht,
             und der Hinweis daneben, wann beide gleich sind. KEIN neues Bedienelement (R12 = 6). */
          h("div", {class: "kl-block"}, hinweisZeile("kl-detail", "Klassenraum-Abdruck (dein geladenes Netz)"), L.abdruck),
          h("div", {class: "kl-block"}, hinweisZeile("kl-hinweis", "Er zeigt dein eigenes Labor. Mit den Geräten der Klasse stimmt er nur überein, wenn bei dir dasselbe Auftragsnetz geladen ist.")),
          L.hinweis),
        h("div", {class: "kl-ampel"},
          h("div", {class: "kl-summe"}, L.lampe, L.summe),
          /* Die Diagnosezeile (3.0, Säule 5): NUR Text, kein Bedienelement — die Lehrkraft-Ansicht
             bleibt bei sechs (R12). Sie ergänzt die Ampel um „wie viele offen / wie viele gerade
             abgegeben / wie frisch die letzte ist" und wiederholt den Median nicht. */
          L.fortschritt,
          L.diagnose,
          L.uebersicht,
          L.tafel),
        h("div", {class: "kl-form"},
          hinweisZeile("kl-etikett", "Ergebnis-Codes"), L.codes,
          h("span", {class: "kl-knoepfe"},
            h("button", {type: "button", class: "knopf kl-knopf", onclick: ergebnisseEintragen}, "Eintragen"),
            h("button", {type: "button", class: "knopf kl-knopf", onclick: dateiDialog}, "Datei…"))))));
    lehrerFuellen();
  }
  /* `wieder` füllt NUR die Behälter – die Eingabefelder bleiben stehen, was darin steht, bleibt stehen. */
  function lehrerWieder(){ if (L.summe) lehrerFuellen(); }

  function lehrerHinweis(text){ if (L.hinweis) L.hinweis.replaceChildren(hinweisZeile("kl-hinweis", text || "")); }
  /* KLR-05b (§ 12.2): anonymes Histogramm aus der echten API. Kein Platz, kein Name, keine Sterne —
     deshalb steht hier nur „Schritt k: n von <Klassenstärke>". */
  function diagnoseText(){
    const d = kann("diagnose") ? ruf("diagnose") : null;
    if (!d || !Array.isArray(d.schritte) || !d.schritte.length) return "Diagnose (anonym): noch kein Hilferuf eingegangen.";
    const nenner = Number(d.plaetze) > 0 ? Number(d.plaetze) : 0;
    return "Diagnose (anonym): " + d.schritte.map(x => "Schritt " + x.schritt + ": " + x.anzahl + (nenner ? " von " + nenner : "")).join(" · ");
  }
  /* KLR-08b (§ 12.2): 20-Übersicht aus der API — „3 abgegeben · 17 offen · noch 8 min“ + offene
     Sitzplätze. Neu in 3.0 heißt es „Sitzplatz N“; die bestehende Ampel-Tafel behält „Platz N · Sterne ·
     Zeit“ (Bestandsvertrag). KEINE Sterne, kein Rang, keine Bestenliste, kein Vergleich — nur
     Anwesenheit und Zeit. */
  function sitzplatzListe(plaetze){
    const liste = (Array.isArray(plaetze) ? plaetze : []).map(Number).filter(n => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
    const teile = [];
    for (let i = 0; i < liste.length; i++){
      let j = i;
      while (j + 1 < liste.length && liste[j + 1] === liste[j] + 1) j++;
      teile.push(i === j ? String(liste[i]) : liste[i] + "–" + liste[j]);
      i = j;
    }
    return teile.join(", ");
  }
  function uebersichtText(){
    const u = kann("uebersicht") ? ruf("uebersicht") : null;
    if (!u) return "Übersicht: keine Sitzung.";
    if (!u.eingerichtet) return "Übersicht: Klassenstärke nicht eingestellt – keine Platzliste.";
    const teile = ["Abgabe: " + u.fertig + " abgegeben", u.offenAnzahl + " offen"];
    teile.push(u.abgelaufen ? "Zeit abgelaufen" : "noch " + u.restMinuten + " min");
    const offen = sitzplatzListe(u.offen);
    if (offen) teile.push("offen: Sitzplatz " + offen);
    if (u.ohnePlatz) teile.push(u.ohnePlatz + " Abgabe ohne gültigen Platz");
    return "Übersicht: " + teile.join(" · ");
  }
  function lehrerFuellen(){
    if (!L.summe) return;
    const s = sitzungJetzt();
    L.code.textContent = (s && s.code) || ABDRUCK_LEER;
    const ab = abdruck();
    L.abdruck.textContent = ab || ABDRUCK_LEER;
    const a = ampel(s, jetzt());                    /* die Uhr nur für „letzte 5 Minuten" */
    L.lampe.className = "kl-lampe" + (a.farbe ? " " + a.farbe : "");
    L.summe.textContent = a.summe;
    L.fortschritt.textContent = a.fortschritt;
    if (L.diagnose) L.diagnose.textContent = diagnoseText();
    if (L.uebersicht) L.uebersicht.textContent = uebersichtText();
    L.tafel.replaceChildren(...a.zeilen.map(z => h("div", {class: "kl-zeile"},
      hinweisZeile("kl-platz", z.platz >= 1 ? `Platz ${z.platz}` : "ohne Platz"),
      hinweisZeile("kl-sterne", sterneText(z.sterne)),
      hinweisZeile("kl-dauer", z.dauerS == null ? "–" : dauerText(z.dauerS)),
      hinweisZeile("kl-fehl", z.versuche >= 3 ? "3+ Fehlversuche" : z.versuche === 1 ? "1 Fehlversuch" : `${z.versuche} Fehlversuche`))));
  }

  function codeAnzeigen(){
    if (!kann("erzeugen")) return lehrerHinweis("Der Klassenraum ist in dieser Fassung nicht eingebaut.");
    const wahl = String(L.auftrag.value || "");
    const quelle = wahl.startsWith("skill:") ? {skill: wahl.slice(6)} : {ticketId: wahl.slice(3)};
    const r = ruf("erzeugen", quelle);
    /* § 12.2: die aktive Sitzung mit Ergebnissen wird nicht still ersetzt. */
    if (r && r.warnung === "sitzung-hat-ergebnisse") return sitzungErsetzenBestaetigen(quelle);
    if (!r || r.fehler) return lehrerHinweis((r && r.grund) || "Der Auftrag ließ sich nicht anlegen.");
    lehrerHinweis("");
    lehrerFuellen();
  }
  function sitzungErsetzenBestaetigen(quelle){
    const s = sitzungJetzt();
    const anzahl = s && s.ergebnisse ? Object.keys(s.ergebnisse).length : 0;
    const inhalt = h("div", {class: "kl-spalte"},
      h("div", {class: "kl-block"}, hinweisZeile("kl-detail",
        "Die laufende Sitzung hat " + anzahl + " Ergebnis" + (anzahl === 1 ? "" : "se") +
        ". Eine neue Sitzung ersetzt sie nicht – die alte bleibt in der Sitzungsliste erhalten.")),
      h("span", {class: "kl-knoepfe"},
        h("button", {type: "button", class: "knopf kl-knopf", onclick: () => UI.app.dialogZu()}, "Abbrechen"),
        h("button", {type: "button", class: "knopf knopf-haupt kl-knopf", onclick: () => {
          UI.app.dialogZu();
          const r = ruf("erzeugen", Object.assign({}, quelle, {bestaetigen: true}));
          if (!r || r.fehler) return lehrerHinweis((r && r.grund) || "Der Auftrag ließ sich nicht anlegen.");
          lehrerHinweis("");
          lehrerFuellen();
        }}, "Neue Sitzung anlegen")));
    UI.app.dialogOeffnen("Sitzung hat Ergebnisse", inhalt);
  }
  function codeKopieren(){
    const s = sitzungJetzt();
    if (!s || !s.code) return lehrerHinweis("Noch keine Sitzung – wähle oben einen Auftrag und zeige den Code.");
    const text = String(s.code);
    if (UI.hub?.kopieren) return void UI.hub.kopieren(text, "Auftragscode kopiert – einfach an die Klasse weitergeben.");
    UI.toast("Kopieren ging nicht – markier den Text und kopier ihn selbst.", "warn", {id: "kopieren", dauer: 3000});
  }

  /* B § 8: EIN Feld, Block oder einzeln; je Zeile eine Rückmeldung; Doppelte werden erkannt.
     KLR-04b (§ 12.2): Ist der Platz schon belegt, wird NICHTS still verworfen — der Hausdialog
     fragt [Abbrechen][Ersetzen][Entfernen]; Esc/Abbrechen ändert nichts. Keine neuen Sicht-
     Elemente (R12 bleibt 6). */
  function ergebnisseEintragen(){
    if (!kann("ergebnisEintragen")) return lehrerHinweis("Der Klassenraum ist in dieser Fassung nicht eingebaut.");
    if (!sitzungJetzt()) return lehrerHinweis("Es läuft keine Sitzung – erst einen Auftrag erzeugen.");
    const stuecke = zerlegen(L.codes.value);
    if (!stuecke.length) return;
    const zeilen = [], gesehen = new Map(), konflikte = [], gesehenH = new Set();
    let neu = 0, doppelt = 0, fremd = 0, unlesbar = 0, hilfen = 0;
    for (const {zeile, stueck} of stuecke){
      /* Ein H-Code ist KEIN Ergebnis (3.0, Säule 5): er sagt, WO jemand hängt, und wird als
         Klartext gelesen — NIE eingetragen. Diese Verzweigung steht deshalb VOR dem Eintragen;
         so kann ein Hilfecode gar nicht erst im Ergebnissatz landen. Nur Platz und Zähler,
         kein Name, keine Note, kein Rang. */
      if (istHilfecode(stueck)){
        const h = kann("hilfeLesen") ? ruf("hilfeLesen", stueck) : null;
        if (!h || h.fehler || h.ok === false){
          unlesbar++;
          /* A's Erklärung wörtlich weitergeben (z. B. „Das sieht nach einem Auftragscode aus
             (NL-…). Hier gehört der Hilfecode hin (H-…).") — die Lehrkraft soll wissen, was zu tun ist. */
          const grund = (h && h.grund) || "Hilfecodes liest diese Fassung noch nicht.";
          zeilen.push(`Zeile ${zeile} · ${grund}${h && h.hinweis ? " " + h.hinweis : ""}`);
          continue;
        }
        /* KLR-05a/b: den H-Code anonym je Schritt zählen (auch wenn eine andere Sitzung aktiv ist —
           die API zählt in die Sitzung des Codes). Doppelte im selben Block zählen einmal. */
        if (!gesehenH.has(stueck)){
          gesehenH.add(stueck);
          if (kann("diagnoseZaehlen")) ruf("diagnoseZaehlen", stueck);
        }
        const ziele = (Number(h.schritt) || 0) + (Number(h.offen) || 0);
        hilfen++;
        zeilen.push(`Zeile ${zeile} · Platz ${h.platz} hängt: ${Number(h.schritt) || 0} von ${ziele} Zielen erfüllt`);
        continue;
      }
      const r = ruf("ergebnisEintragen", stueck);
      if (r && r.warnung === "platz-hat-ergebnis"){
        const gelesen = kann("ergebnisLesen") ? ruf("ergebnisLesen", stueck) : null;
        konflikte.push({zeile, stueck, platz: gelesen && gelesen.platz, sterne: gelesen && gelesen.sterne});
        continue;
      }
      if (!r || r.fehler){ if (r && r.fehler === "sitzung") fremd++; else unlesbar++; zeilen.push(`Zeile ${zeile} · ${(r && r.grund) || "unlesbar"}`); continue; }
      if (r.neu === false){
        doppelt++;
        const wo = gesehen.get(stueck);
        zeilen.push(`Zeile ${zeile} · ${stueck} · ` + (r.grund === "platz-schon-da"
          ? `Platz ${r.platz} hat schon ein Ergebnis – das zuerst eingetragene gilt.`
          : `doppelt${wo ? ` – steht schon in Zeile ${wo}` : ""}`));
        continue;
      }
      gesehen.set(stueck, zeile);
      neu++;
      zeilen.push(`Zeile ${zeile} · Platz ${r.platz} · ${sterneText(Math.round((Number(r.sterne) || 0) * 2))} · eingetragen`);
    }
    L.codes.value = "";
    const summeBauen = () => [`${neu} eingetragen`, doppelt ? `${doppelt} doppelt` : null, fremd ? `${fremd} fremde Sitzung` : null,
      hilfen ? `${hilfen} Hilferuf${hilfen === 1 ? "" : "e"} gelesen` : null,
      unlesbar ? `${unlesbar} unlesbar` : null].filter(Boolean).join(" · ");
    const abschluss = () => {
      L.hinweis.replaceChildren(hinweisZeile("kl-hinweis", summeBauen()), ...zeilen.map(z => hinweisZeile("kl-hinweis", z)));
      lehrerFuellen();
    };
    if (!konflikte.length){ abschluss(); return; }
    /* KLR-04b: der ERSTE Doppelplatz wird quittiert; weitere bleiben ehrlich offen. */
    const k = konflikte[0];
    if (konflikte.length > 1) zeilen.push(`${konflikte.length - 1} weiterer Doppelplatz offen – bitte einzeln eintragen.`);
    abschluss();
    const inhalt = h("div", {class: "kl-spalte"},
      h("div", {class: "kl-block"}, hinweisZeile("kl-detail",
        `Zeile ${k.zeile} · Platz ${k.platz} hat schon ein Ergebnis (${sterneText(k.sterne)}). Ersetzen, entfernen oder nichts ändern?`)),
      h("span", {class: "kl-knoepfe"},
        h("button", {type: "button", class: "knopf kl-knopf", onclick: () => {
          UI.app.dialogZu();
          zeilen.push(`Zeile ${k.zeile} · Platz ${k.platz} · nichts geändert`);
          abschluss();
        }}, "Abbrechen"),
        h("button", {type: "button", class: "knopf kl-knopf", onclick: () => {
          UI.app.dialogZu();
          const rr = ruf("ergebnisEintragen", k.stueck, {ersetzen: true, bestaetigen: true});
          if (rr && rr.ok && rr.ersetzt) zeilen.push(`Zeile ${k.zeile} · Platz ${k.platz} · ersetzt`);
          else zeilen.push(`Zeile ${k.zeile} · ${(rr && rr.grund) || "Ersetzen ging nicht"}`);
          abschluss();
        }}, "Ersetzen"),
        h("button", {type: "button", class: "knopf kl-knopf", onclick: () => {
          UI.app.dialogZu();
          const rr = ruf("ergebnisEntfernen", k.platz, {bestaetigen: true});
          if (rr && rr.ok) zeilen.push(`Zeile ${k.zeile} · Platz ${k.platz} · entfernt`);
          else zeilen.push(`Zeile ${k.zeile} · ${(rr && rr.grund) || "Entfernen ging nicht"}`);
          abschluss();
        }}, "Entfernen")));
    UI.app.dialogOeffnen("Platz " + k.platz + " hat schon ein Ergebnis", inhalt);
  }

  /* B § 10: Export UND Import auf EINEM Knopf (R12) – der Dialog bringt Escape und Fokusfalle mit.
     Die Sitzungsauswahl (KLR-01b, § 12.1/§ 12.2) liegt hier im Dialog, nicht in der Ansicht: die
     Lehrkraft-Ansicht bleibt bei SECHS Bedienelementen (R12, § 12.5, Leitungsentscheidung O1). */
  function dateiDialog(){
    const plaetze = h("select", {class: "kl-feld", "aria-label": "Plätze der Klasse"});
    const jetzt = Number(ruf("plaetze")) || 0;
    plaetze.append(h("option", {value: "0"}, "Plätze nicht eingestellt"),
      ...Array.from({length: 31}, (_, i) => h("option", {value: String(i + 1)}, `${i + 1} Plätze`)));
    plaetze.value = String(jetzt);
    plaetze.onchange = () => { const r = ruf("plaetzeSetzen", Number(plaetze.value) || null); if (r && r.fehler) lehrerHinweis(r.grund); else lehrerFuellen(); };
    const liste = ruf("sitzungen") || [];
    const zeilen = liste.map(s => {
      const anzahl = s && s.ergebnisse ? Object.keys(s.ergebnisse).length : 0;
      const steuer = s && s.aktiv
        ? h("span", {class: "kl-detail"}, "Aktive Sitzung")
        : h("button", {type: "button", class: "knopf kl-knopf", onclick: () => {
            const r = ruf("sitzungWaehlen", s.id);
            if (!r || r.fehler) return lehrerHinweis((r && r.grund) || "Die Sitzung ließ sich nicht laden.");
            UI.app.dialogZu();
            lehrerFuellen();
            dateiDialog();                              /* Liste mit neuem Stand zeigen */
          }}, "Sitzung laden");
      return h("div", {class: "kl-zeile"},
        hinweisZeile("kl-code", (s && s.code) || "—"),
        hinweisZeile("kl-detail", ((s && s.titel) || "Sitzung") + " · " + anzahl + " Ergebnis" + (anzahl === 1 ? "" : "se")),
        steuer);
    });
    const inhalt = h("div", {class: "kl-spalte"},
      h("div", {class: "kl-block"},
        hinweisZeile("kl-etikett", "Sitzungen auf diesem Gerät: " + liste.length),
        ...zeilen),
      h("div", {class: "kl-form"}, hinweisZeile("kl-etikett", "Klassenstärke"), plaetze),
      h("div", {class: "kl-block"}, hinweisZeile("kl-detail", "Die Sitzungen liegen nur auf diesem Rechner. Die Datei ist die Vollsicherung – und der Weg auf einen anderen Rechner.")),
      h("span", {class: "kl-knoepfe"},
        h("button", {type: "button", class: "knopf kl-knopf", onclick: () => { exportieren(); UI.app.dialogZu(); }}, "Exportieren"),
        h("button", {type: "button", class: "knopf kl-knopf", onclick: () => importieren()}, "Importieren")));
    UI.app.dialogOeffnen("Klassenraum-Datei", inhalt);
  }
  function exportieren(){
    const text = ruf("exportieren");
    if (!text || typeof text !== "string"){ UI.toast((text && text.grund) || "Es läuft keine Sitzung – nichts zu exportieren.", "warn", {id: "kl-datei", dauer: 6000}); return; }
    try {
      Promise.resolve(Plattform.datei.exportieren(`klassenraum-${heute()}.json`, text))
        .then(ok => { if (ok !== false) UI.toast("Klassenraum-Datei gesichert.", "ok", {id: "kl-datei", dauer: 4000}); })
        .catch(() => UI.toast("Die Datei ließ sich nicht sichern.", "warn", {id: "kl-datei", dauer: 6000}));
    } catch (e) { console.error("Klassenraum-Export", e); UI.toast("Die Datei ließ sich nicht sichern.", "warn", {id: "kl-datei", dauer: 6000}); }
  }
  /* Der Import ist eine VOLLSICHERUNG (§ 12.1): er ersetzt alle Sitzungen des Geräts. Weil das ein
     Datenverlust sein kann, bestätigt die Lehrkraft vorher; erst danach wird die Datei gewählt. */
  function importieren(){
    UI.app.dialogZu();
    const liste = ruf("sitzungen") || [];
    const mitErgebnissen = liste.filter(s => s && s.ergebnisse && Object.keys(s.ergebnisse).length).length;
    if (liste.length){
      const inhalt = h("div", {class: "kl-spalte"},
        h("div", {class: "kl-block"}, hinweisZeile("kl-detail",
          "Die Datei ist eine Vollsicherung: Sie ersetzt alle " + liste.length + " Sitzungen auf diesem Gerät" +
          (mitErgebnissen ? " – " + mitErgebnissen + " davon mit Ergebnissen" : "") + ".")),
        h("span", {class: "kl-knoepfe"},
          h("button", {type: "button", class: "knopf kl-knopf", onclick: () => UI.app.dialogZu()}, "Abbrechen"),
          h("button", {type: "button", class: "knopf knopf-haupt kl-knopf", onclick: () => { UI.app.dialogZu(); dateiImportieren(); }}, "Datei wählen und ersetzen")));
      UI.app.dialogOeffnen("Sitzungen ersetzen?", inhalt);
      return;
    }
    dateiImportieren();
  }
  function dateiImportieren(){
    let p;
    try { p = Plattform.datei.importieren(); } catch (e) { console.error("Klassenraum-Import", e); return; }
    if (!p || typeof p.then !== "function") return;      /* abgebrochen: keine Meldung (B § 10.3) */
    try {
      p.then(text => {
        if (!text) return;
        const vorher = ruf("exportieren");                /* verlustfreie Sicherung für „Rückgängig“ */
        const r = ruf("importieren", text);
        if (!r || !r.ok){
          const titel = r && r.fehler === "fassung" ? "Zu neues Format" : "Klassenraum-Datei";
          UI.toast((r && r.grund) || "Das ist keine Klassenraum-Datei.", "warn", {id: "kl-datei", titel, dauer: r && r.fehler === "fassung" ? 14000 : 6000});
          return;
        }
        const anzahl = Array.isArray(r.sitzungen) ? r.sitzungen.length : (ruf("sitzungen") || []).length;
        const zurueck = typeof vorher === "string" ? {text: "Rückgängig", fn: () => { ruf("importieren", vorher); lehrerFuellen(); }} : null;
        UI.toast("Datei eingelesen – " + anzahl + " Sitzung" + (anzahl === 1 ? "" : "en") + ".", "ok", {id: "kl-datei", dauer: 8000, aktion: zurueck});
        lehrerFuellen();
        dateiDialog();                                    /* Liste + Anzahl nach dem Import zeigen */
      }).catch(() => UI.toast("Die Datei ließ sich nicht lesen.", "warn", {id: "kl-datei", dauer: 6000}));
    } catch (e) { console.error("Klassenraum-Import", e); UI.toast("Die Datei ließ sich nicht lesen.", "warn", {id: "kl-datei", dauer: 6000}); }
  }

  /* ================================================================ Azubi */
  const A = {};

  function schuelerZeigen(c){
    A.code = h("input", {type: "text", class: "kl-feld", placeholder: "NL-4F7K-2Q", spellcheck: "false",
      autocomplete: "off", autocapitalize: "characters", "aria-label": "Auftragscode"});
    A.platz = h("input", {type: "text", class: "kl-feld", inputmode: "numeric", maxlength: "2", "aria-label": "Platz",
      placeholder: "0"});
    A.hinweis = hinweisZeile("kl-hinweis", "Kein Auftrag offen – tippe den Code ein, den deine Lehrkraft ansagt.");
    A.abdruck = h("span", {class: "kl-code"}, ABDRUCK_LEER);
    const form = h("form", {class: "kl-form", onsubmit: e => { e.preventDefault(); schuelerOeffnen(); }},
      hinweisZeile("kl-etikett", "Auftragscode"), A.code,
      hinweisZeile("kl-etikett", "Platz"), A.platz,
      h("button", {type: "submit", class: "knopf knopf-haupt kl-knopf"}, "Auftrag öffnen"));
    c.replaceChildren(h("div", {class: "kl-schueler"},
      h("div", {class: "kl-spalte"},
        h("header", {class: "kl-kopf"}, h("h2", {}, "Mitarbeit"), h("p", {class: "kl-klein"}, START_HINWEIS)),
        form,
        h("div", {class: "kl-karte"},
          hinweisZeile("kl-etikett", "Stand"), A.hinweis,
          h("div", {class: "kl-block"}, hinweisZeile("kl-detail", "Klassenraum-Abdruck"), A.abdruck)))));
    schuelerFuellen();
  }
  function schuelerWieder(){ if (A.hinweis) schuelerFuellen(); }

  function schuelerHinweis(text, ok){
    A.hinweis.textContent = text || "Kein Auftrag offen – tippe den Code ein, den deine Lehrkraft ansagt.";
    markieren(A.code, !ok && !!text);
  }
  function schuelerFuellen(){
    const inst = UI.spiel?.inst;
    const offen = !!(inst && inst.klassenraum);
    if (offen){
      const platz = Number(inst.klassenraum.platz) || 0;
      A.hinweis.textContent = `Auftrag angenommen: ${Spiel.defVon(inst)?.titel || "Auftrag"} · Platz ${platz}` +
        (abdruck() ? ` · Klassenraum-Abdruck ${abdruck()} – vergleich ihn mit deinem Nachbarn.` : "");
    }
    A.abdruck.textContent = abdruck() || ABDRUCK_LEER;
  }
  function schuelerOeffnen(){
    /* Platz zuerst merken – er gehört in den Ergebnis-Code (A § 2.2). Leer heißt: nicht ändern. */
    const p = String(A.platz.value || "").trim();
    if (p && kann("platzSetzen")){ const r = ruf("platzSetzen", Number(p)); if (r && r.fehler) return schuelerHinweis(r.grund, false); }
    oeffnen(A.code.value, (text, ok) => schuelerHinweis(text, ok));
  }

  /* ---------------- der Öffnungsweg (B § 6.1 – so, und nur so) ---------------- */
  function oeffnen(eingabe, melde){
    if (!kann("ausCode")){ melde("Der Klassenraum ist in dieser Fassung nicht eingebaut.", false); return null; }
    const c = ruf("ausCode", eingabe);
    if (!c) return null;                                      /* nichts eingetippt: keine Meldung */
    if (c.fehler){ melde(c.grund, false); return null; }       /* Tippfehler: markiert, nicht abgewiesen */
    const offen = UI.spiel?.inst;
    if (offen && offen.klassenraum && offen.klassenraum.code === c.code){
      UI.spiel.oeffnen(offen.iid);                            /* derselbe Auftrag: weiterarbeiten */
      melde("Dieser Auftrag ist schon offen. Weiterarbeiten?", true);
      return offen;
    }
    if (!Spiel._st) Spiel.laden();                            /* frischer Schulrechner (B § 2.6) */
    const inst = c.skill
      ? Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true})
      : Spiel.instanzErstellen({ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
    inst.klassenraum = {sitzung: c.sitzung, platz: (Number(ruf("platz")) || 0), code: c.code};
    UI.spiel.oeffnen(inst.iid);
    melde(null, true);
    return inst;
  }

  /* „Ich hänge" (3.0, Säule 5, Weg A) — EIN Knopf für die Auftragsmappe des LABORS.
     Öffentliche Fläche: `UI.klassenraum.hilfeKnopf()`; `spiel.js` hängt ihn neben die Klassenraum-
     Zeile. Er holt den Hilfecode (`hilfeCode(inst)`), zeigt ihn IM Knopf und kopiert ihn beim
     Klick; ein zweiter Klick kopiert denselben Code noch einmal. Warum nur EIN Bedienelement:
     die Laboransicht ist keine R12-Ansicht, aber je weniger desto besser — und der Code steht so
     direkt neben „Klassenraum-Auftrag · Platz 7" (dort hängt der Azubi; die Ansicht „Auftrag" hat
     ihre eigene Grenze 3 und bleibt bei drei, B § 2.2). Ehrlich in jedem Fehlweg: kein Auftrag →
     Absage; API fehlt → Absage; Codec-Fehler → A's `grund` (mit `hinweis`). Der Code trägt Platz
     und Zähler — NIE einen Namen, NIE eine Note, NIE einen Rang. */
  function hilfeKnopf(){
    const knopf = h("button", {type: "button", class: "knopf geist klein kl-hilfe",
      "aria-label": "Ich hänge – Hilfecode zeigen und kopieren"}, "Ich hänge");
    let code = null;
    const melde = (text, art) => UI.toast(text, art, {id: "kl-hilfe", dauer: art === "warn" ? 9000 : 6000});
    const kopiere = text => {
      const k = UI.hub?.kopieren || UI.kopieren;                 /* Hausweg; die schmale Fassung kennt nur UI.kopieren */
      if (typeof k === "function") return void k(text, "Hilfecode kopiert – zeig ihn deiner Lehrkraft.");
      melde("Kopieren ging nicht – schreib den Code ab: " + text, "warn");
    };
    knopf.addEventListener("click", () => {
      if (code) return void kopiere(code);                       /* zweiter Klick: noch einmal kopieren */
      const inst = UI.spiel?.inst || (typeof Spiel !== "undefined" ? Spiel.inst : null);
      if (!inst || !inst.klassenraum) return melde("Es ist kein Klassenraum-Auftrag offen – es gibt nichts zu melden.", "warn");
      if (!kann("hilfeCode")) return melde("Hilfecodes kann diese Fassung noch nicht – sag es deiner Lehrkraft mündlich.", "warn");
      const r = ruf("hilfeCode", inst);
      if (typeof r !== "string" || !r){
        return melde(((r && r.grund) || "Es gibt gerade nichts zu melden.") + (r && r.hinweis ? " " + r.hinweis : ""), "warn");
      }
      code = r;
      knopf.textContent = r;                                     /* der Code STEHT im Knopf … */
      knopf.classList.add("kl-hilfe-code");                      /* … größer, in der Code-Schrift … */
      kopiere(r);                                                /* … und ist gleich kopiert. */
    });
    return knopf;
  }

  /* ---------------- Startseiten-Zeile (B § 4, Entscheidung L5: Haken auf Bus „ansicht“) ----------------
     Kein Eingriff in hub.js: die Zeile hängt sich idempotent in die vorhandene `.hb-seite`. Sie
     verschwindet mit jedem Neuaufbau des Hubs (hub.js:63 `replaceChildren`) von selbst und wird
     danach frisch wieder eingehängt – auch nach `Spiel.neu()`. */
  function startZeile(){
    if (!kann("ausCode")) return null;                        /* ohne Bereich A kein DOM (B § 4.2) */
    const feld = h("input", {type: "text", class: "kl-start-feld", id: "kl-start-feld", placeholder: "NL-4F7K-2Q",
      spellcheck: "false", autocomplete: "off", autocapitalize: "characters", "aria-label": "Klassenraum-Code"});
    const hinweis = hinweisZeile("kl-hinweis", "");
    const los = () => oeffnen(feld.value, (text, ok) => { hinweis.textContent = text || (ok ? "" : START_FEHLER); markieren(feld, !ok && !!text); });
    feld.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); los(); } });
    return h("div", {class: "kl-start"},
      h("label", {class: "kl-start-etikett", for: "kl-start-feld"}, "Klassenraum-Code"),
      feld,
      h("button", {type: "button", class: "hb-oder-zeile kl-start-knopf", onclick: los}, "Öffnen"),
      hinweis);
  }
  function startEinhaengen(){
    if (typeof document === "undefined" || !kann("ausCode")) return false;
    const seite = document.querySelector(".hb-seite");
    if (!seite || seite.querySelector(".kl-start")) return false;
    const zeile = startZeile();
    if (!zeile) return false;
    const kacheln = seite.querySelector(".hb-kacheln");
    if (kacheln && kacheln.parentNode === seite) seite.insertBefore(zeile, kacheln);   /* unter der Auftragskarte, über den Kacheln */
    else seite.append(zeile);
    return true;
  }

  /* ---------------- Ergebnis-Code für die Lehrkraft (B § 7) ----------------
     Der Kanal „klassenraum“ kommt aus `Spiel.klassenraum` und trägt VIER verschiedene Meldungen:
     `erzeugen` den AUFTRAGSCODE unter `auftragscode` (src/spiel/klassenraum.js:181),
     `ergebnisEintragen` nur den Platz (:272), `importieren` eine Sitzungskennung (:321),
     `plaetzeSetzen` die Platzzahl (:354) — und NUR `abnehmen` den fertigen ERGEBNIS-Code
     unter `code` (:386-387). Gemessen im Vorführlauf am 10.10.2026: solange der Auftragscode im
     Feld `code` stand, zeigte dieser Hörer ihn 20 s lang als „Ergebnis-Code“ an und verdeckte
     die Knöpfe „Eintragen“/„Datei…“.
     Deshalb liest er AUSSCHLIESSLICH `code` und lässt nur die GEDRUCKTE FORM des Ergebnis-Codes
     durch: `E-XXXX-XXX` (Spezifikation § 2.2, immer genau 10 Zeichen). Ein Auftragscode (`NL-…`)
     kann so nie als Ergebnis erscheinen — auch nicht, wenn ihn eine künftige Quelle wieder in
     `code` schriebe. Geprüft wird bewusst die FORM, nicht die Prüfziffer: die Quelle setzt hier
     den fertigen Code aus `ergebnisCode` ein, und die Prüfziffer prüft der Codec dort, wo es
     zählt — beim Eintragen (`ergebnisEintragen`). */
  function ergebnisToast(d){
    const code = d && typeof d.code === "string" ? d.code : null;
    if (!code || !/^E-[0-9A-Z]{4}-[0-9A-Z]{3}$/.test(code)) return null;   /* kein Ergebnis-Code → still */
    UI.toast("Ergebnis-Code für deine Lehrkraft: " + code, "ok", {id: "klassenraum-code", titel: "Für die Lehrkraft",
      dauer: 20000, aktion: {text: "Kopieren", fn: () => UI.hub.kopieren(code, "Ergebnis-Code kopiert – gib ihn deiner Lehrkraft.")}});
    return code;
  }

  /* ---------------- Einstellungen (B § 11) ----------------
     VIS-04 (§ 12.6): Server (Stufe C) und QR (Stufe D) sind in 3.0 NICHT gebaut. Der frühere
     Schalter war wirkungslos — er schrieb nur eine Einstellung, die niemand las. Statt eines
     Schalters ohne Wirkung steht hier ein ehrlicher Hinweis auf 3.1; kein Bedienelement. */
  function abschnitt(el){
    if (!el) return;
    el.append(h("div", {class: "einst-zeile"},
      h("div", {class: "einst-text"},
        h("strong", {}, "Klassenraum-Server (nur Desktop)"),
        h("span", {}, "In dieser Fassung nicht gebaut (3.1): Es gibt keinen Serverbetrieb, keine Portanzeige und keinen QR-Code. Die Klasse tippt die Ergebnis-Codes ab – alles andere läuft ohne Server und ohne Netz.")),
      h("div", {class: "einst-steuer"}, h("span", {class: "kl-detail"}, "nicht in dieser Fassung"))));
  }

  /* ---------------- Anmeldung: EIN Start-Haken (B § 1.2) ---------------- */
  (UI.startHaken ||= []).push(() => {
    UI.app.registrieren("klassenraum", {titel: "Klasse", symbol: "kunden", zeigen: lehrerZeigen, wieder: lehrerWieder});
    UI.app.registrieren("mitarbeit", {titel: "Auftrag", symbol: "akte", zeigen: schuelerZeigen, wieder: schuelerWieder});
    UI.app.einstellungAbschnitt("Klassenraum", abschnitt);
    for (const e of ["ansicht", "zustand-geaendert", "spiel-geladen"]) Bus.an(e, () => { try { startEinhaengen(); } catch (err) { console.error("Klassenraum-Zeile", err); } });
    Bus.an("klassenraum", d => { try { ergebnisToast(d); } catch (err) { console.error("Klassenraum-Code", err); } });
    startEinhaengen();
  });

  return {ampel, zerlegen, dauerText, sterneText, oeffnen, startZeile, startEinhaengen, ergebnisToast,
    lehrerZeigen, lehrerWieder, schuelerZeigen, schuelerWieder, abschnitt, abdruck, hilfeKnopf, _L: L, _A: A};
})();
