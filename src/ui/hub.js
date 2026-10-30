"use strict";
/* ---------- Hub „Heute“: die ruhige Startseite (Design – Spielspaß 2.0, Hebel 4; Architektur § 9.3) ----------
   Datumszeile und Serie · eine Karte mit dem nächsten Auftrag (oben der Kunde) und dem einzigen Hauptknopf (darunter „oder:“ zwei weitere als kleine Zeilen) · drei Kacheln
   (Aufwärmen · Tagesrätsel · Post bzw. Fehlerdex) · nach dem Tagesziel Feierabend mit Bilanz und Ausblick.
   Platzbudget R5: ≤ 40 Wörter, genau ein Hauptknopf. Dazu: Aufwärmen (3 Mini-Karten), Tagesrätsel-Ergebnis
   zum Kopieren, Fehlerdex (Abschnitt im Lernstand) und das Spieltagebuch (Einstellungen, Lernstand). Präfix hb-, dx-. */
UI.hub = (() => {
  let wurzel = null;
  const datumText = () => new Intl.DateTimeFormat("de-DE", {weekday: "long", day: "numeric", month: "long"}).format(new Date());
  const zahl = x => String(Math.round(x * 10) / 10).replace(".", ",");
  const sterneText = s => "★".repeat(Math.floor(s)) + (s % 1 ? "½" : "") + "☆".repeat(Math.max(0, 5 - Math.ceil(s)));

  function overlay(inhalt, klasse = ""){
    const o = h("div", {class: "sp-overlay " + klasse, role: "dialog", "aria-modal": "true"}, h("div", {class: "sp-karte"}, inhalt));
    document.body.append(o);
    requestAnimationFrame(() => o.classList.add("da"));
    const esc = e => { if (e.key === "Escape") zu(); };
    const zu = () => { o.classList.remove("da"); setTimeout(() => o.remove(), UI.zeit("dauer")); document.removeEventListener("keydown", esc); };
    document.addEventListener("keydown", esc);
    return zu;
  }

  /* ---------- Startseite ---------- */
  function zeigen(c){
    wurzel = c;
    if (!Spiel._st) { c.replaceChildren(); return; }
    const s = Spiel.hub.stand(), n = s.naechster, fa = s.feierabend;
    const w = UI.app.werte || {euro: 0, ruf: 0, stufe: 1, offen: 0};
    const serie = s.serie.tage || 0;
    const weiterFn = () => { if (n.art === "leer") { const i = Spiel.nachschub(); UI.spiel.status(); if (i) UI.spiel.oeffnen(i.iid); } else UI.spiel.oeffnen(n.iid); };
    const form = (Spiel.FORMEN[n.form] || Spiel.FORMEN.stoerung);
    const euroText = `${zahl(w.euro)} €`, rufText = `${zahl(w.ruf)}`;

    /* Hero: Auftrag (oder Feierabend) wie im Mockup – Kicker, Kunde, grosser Titel, Fliesstext, Chips, Aktionen */
    const hero = fa
      ? h("section", {class: "hb-hero hb-panel"}, h("div", {class: "hb-kicker"}, "// HEUTE · FEIERABEND"),
          h("div", {class: "hb-hero-kunde"}, h("h3", {}, UI.symbol("feierabend", 18), " Feierabend")),
          h("h1", {}, "Geschafft für heute"), h("p", {class: "hb-hero-lead"}, fa.ausblick),
          h("div", {class: "hb-hero-meta"}, h("span", {}, `${fa.bilanz.tickets} Aufträge`), h("span", {}, `Ø ${zahl(fa.bilanz.sterne)} ★`), h("span", {}, `+${eur(fa.bilanz.euro)} €`)),
          h("div", {class: "hb-aktionen"},
            h("button", {type: "button", class: "knopf primaer hb-annehmen", onclick: () => UI.modus("leiste")}, "Zur Leiste"),
            h("button", {type: "button", class: "knopf geist", onclick: weiterFn}, "Noch einen Auftrag")))
      : n.art === "leer"
      ? h("section", {class: "hb-hero hb-panel"}, h("div", {class: "hb-kicker"}, "// HEUTE · " + datumText().toUpperCase()),
          h("h1", {}, "Alles erledigt"), h("p", {class: "hb-hero-lead"}, "Kein offener Auftrag im Postfach. Neue Kunden melden sich laufend."),
          h("div", {class: "hb-aktionen"}, h("button", {type: "button", class: "knopf primaer hb-annehmen", onclick: weiterFn}, "Neuen Auftrag holen ▸")))
      : h("section", {class: "hb-hero hb-panel" + (n.klingelt ? " klingelt" : ""), style: {"--k": `var(${n.farbe || "--accent"})`}},
          h("div", {class: "hb-kicker"}, "// AUFTRAG · " + (n.art === "weiter" ? "WEITER" : "EINSTIEG") + " · " + String(n.kunde || "").toUpperCase()),
          h("div", {class: "hb-hero-kunde"}, UI.symbol("auftrag", 16), " " + (n.klingelt ? n.kontakt + " ruft an" : n.kunde)),
          h("h1", {}, n.titel),
          h("p", {class: "hb-hero-lead"}, `${form.titel} · ~${n.minuten} min · ${eur(n.euro)} €`),
          h("div", {class: "hb-hero-meta"},
            h("span", {class: "warn"}, form.titel.toUpperCase()),
            h("span", {}, `~${n.minuten} MIN`),
            h("span", {}, `${eur(n.euro)} €`),
            h("span", {}, `ZIELE 0/1`)),
          h("div", {class: "hb-aktionen"},
            h("button", {type: "button", class: "knopf primaer hb-annehmen", onclick: () => UI.spiel.oeffnen(n.iid)}, n.klingelt ? "Rangehen ▸" : n.art === "weiter" ? "Weiterarbeiten ▸" : "Annehmen ▸"),
            s.weitere.length ? h("button", {type: "button", class: "knopf geist", onclick: () => UI.spiel.oeffnen(s.weitere[0].iid)}, "Anderer Auftrag") : h("button", {type: "button", class: "knopf geist", onclick: () => UI.app.ansicht("postfach")}, "Postfach")));

    /* Kennzahlen-Spalte */
    const spark = (...hoehen) => h("span", {class: "hb-spark"}, hoehen.map((x, i) => h("i", {style: {"height": x + "px"}, class: i === hoehen.length - 1 ? "spitze" : ""})));
    const kennzahlen = h("aside", {class: "hb-kenndaten hb-panel"},
      h("div", {class: "hb-kd", style: {"--c": "var(--amber)"}}, h("i"), h("span", {class: "lab"}, "KONTO"), h("b", {}, euroText), spark(10, 16, 12, 22, 17, 26, 34)),
      h("div", {class: "hb-kd", style: {"--c": "var(--iris)"}}, h("i"), h("span", {class: "lab"}, "RUF"), h("b", {}, rufText), spark(22, 15, 27, 19, 30, 26, 33)),
      h("div", {class: "hb-kd", style: {"--c": "var(--accent)"}}, h("i"), h("span", {class: "lab"}, "SERIE"), h("b", {}, String(serie), h("small", {}, serie === 1 ? "TAG" : "TAGE")), spark(12, 18, 14, 22, 20, 26, 28)));

    const kachel = (sym, titel, info, fn, fertig) => h("button", {type: "button", class: "hb-zeile" + (fertig ? " fertig" : ""), onclick: fn},
      h("i", {"aria-hidden": "true"}), h("b", {}, titel), h("small", {}, info));
    /* Tagesziel mit Ring und Zeilen (klickbar) */
    const anteil = Math.min(1, s.tagesziel.erledigt / Math.max(1, s.tagesziel.ziel));
    const ziel = h("section", {class: "hb-panel hb-ziel-karte"},
      h("div", {class: "hb-ring", style: {"--anteil": Math.round(anteil * 100) + "%"}}, h("b", {}, `${s.tagesziel.erledigt}/${s.tagesziel.ziel}`)),
      h("div", {class: "hb-ziel-liste"},
        h("div", {class: "hb-panel-titel"}, "// TAGESZIEL"),
        kachel(UI.symbol("kaffee", 22), "Aufwärmen", `${s.aufwaermen.erledigt}/${s.aufwaermen.ziel} Karten`, aufwaermen, s.aufwaermen.erledigt >= s.aufwaermen.ziel),
        kachel(UI.symbol("raetsel", 22), `Tagesrätsel #${s.raetsel.nr}`, s.raetsel.geloest ? "gelöst" : (Spiel.NIVEAU_NAME[s.raetsel.niveau] || s.raetsel.niveau), raetsel, s.raetsel.geloest),
        kachel(UI.symbol("dex", 22), "Fehlerdex", `${s.dex.verstanden}/${s.dex.gesamt}`, () => s.post.ungelesen ? UI.app.ansicht("postfach") : dexOeffnen(), s.dex.verstanden >= s.dex.gesamt)));

  /* Letzte Sitzung: Zustand von heute als ruhige Zeilen */
    const sitzung = h("section", {class: "hb-panel hb-sitzung"},
      h("div", {class: "hb-panel-titel"}, "// LETZTE SITZUNG"),
      h("div", {class: "hb-sz"}, h("time", {}, "HEUTE"), h("div", {}, h("b", {}, n.art === "leer" ? "Kein offener Auftrag" : `Auftrag: ${n.titel}`), h("small", {}, n.art === "leer" ? "Postfach leer" : n.kunde)), h("em", {}, n.klingelt ? "ANRUF" : "OFFEN")),
      h("div", {class: "hb-sz"}, h("time", {}, "SERIE"), h("div", {}, h("b", {}, `${serie} ${serie === 1 ? "Tag" : "Tage"} in Folge`), h("small", {}, "Tagesziel zählt weiter")), h("em", {}, serie ? "+1" : "0")),
      h("div", {class: "hb-sz"}, h("time", {}, "POST"), h("div", {}, h("b", {}, "Postfach"), h("small", {}, `${s.post.ungelesen} ungelesen`)), h("em", {}, String(s.post.ungelesen))));

    /* Klassenraum */
    const klasse = h("section", {class: "hb-panel hb-klasse"},
      h("div", {class: "hb-panel-titel"}, "// KLASSENRAUM"),
      h("div", {class: "hb-klasse-zeile"},
        h("button", {type: "button", class: "knopf primaer", onclick: () => UI.app.ansicht("klasse")}, "Code anzeigen"),
        h("small", {}, "Kein Server, kein Login.")),
      h("div", {class: "hb-klasse-zeile"}, h("small", {}, "Auftragscode eingeben"), h("span", {class: "hb-pill"}, "NL-····")));

    /* Lagebild (ruhige Vorschau wie im Mockup) */
    const lage = h("section", {class: "hb-panel hb-lage"},
      h("div", {class: "hb-panel-titel"}, "// LAGEBILD · EBENE " + String((UI.ebenen && UI.ebenen.aktuell) || "ip").toUpperCase()),
      (() => { const el = sv("svg", {class: "hb-lage-svg", viewBox: "0 0 900 236", preserveAspectRatio: "none", "aria-hidden": "true"}); el.innerHTML =
        `<circle cx="330" cy="120" r="54" fill="url(#hbglut)"/>
         <path d="M212 120 C 226 120, 234 120, 248 120" fill="none" stroke="url(#hblinie)" stroke-width="2" stroke-linecap="round"/>
         <path d="M320 96 C 320 66, 406 82, 470 82" fill="none" stroke="url(#hblinie)" stroke-width="2" stroke-linecap="round"/>
         <path d="M320 144 C 320 174, 406 158, 470 158" fill="none" stroke="#FF8A7A" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 8"/>
         <path d="M548 82 C 578 82, 600 82, 626 82" fill="none" stroke="url(#hblinie)" stroke-width="2" stroke-linecap="round"/>
         <defs><linearGradient id="hblinie" x1="0" x2="1"><stop offset="0" stop-color="#7DF3C0"/><stop offset="1" stop-color="#9C8CFF"/></linearGradient>
         <radialGradient id="hbglut"><stop offset="0" stop-color="#7DF3C0" stop-opacity=".16"/><stop offset="1" stop-color="#7DF3C0" stop-opacity="0"/></radialGradient></defs>`; return el; })(),
      h("div", {class: "hb-knoten", style: {"left": "2%", "top": "46%"}}, h("span", {}, "▭"), h("b", {}, "PC-KASSE"), h("small", {}, "192.168.10.50")),
      h("div", {class: "hb-knoten", style: {"left": "32%", "top": "46%"}}, h("span", {}, "⇄"), h("b", {}, "SW-SALON"), h("small", {}, "192.168.10.2")),
      h("div", {class: "hb-knoten", style: {"left": "44%", "top": "12%"}}, h("span", {}, "⌂"), h("b", {}, "R-SALON"), h("small", {}, "192.168.10.1")),
      h("div", {class: "hb-knoten", style: {"left": "42%", "top": "68%"}}, h("span", {}, "▯"), h("b", {}, "PC-BÜRO"), h("small", {}, "192.168.10.12")),
      h("div", {class: "hb-knoten", style: {"left": "68%", "top": "8%"}}, h("span", {}, "◎"), h("b", {}, "INTERNET"), h("small", {}, "203.0.113.57")),
      h("div", {class: "hb-legende"}, h("span", {}, "—— VERBUNDEN"), h("span", {}, "┄ KEIN LINK")));

    /* Signal */
    const signal = h("section", {class: "hb-panel hb-signal"},
      h("div", {class: "hb-panel-titel"}, "// SIGNAL"),
      (() => { const el = sv("svg", {class: "hb-signal-svg", viewBox: "0 0 300 64", preserveAspectRatio: "none", "aria-hidden": "true"}); el.innerHTML =
        `<path d="M0 44 C 30 44, 34 26, 60 26 S 96 46, 120 40 156 18, 180 24 216 44, 240 36 276 20, 300 24" fill="none" stroke="url(#hbw)" stroke-width="1.6"/>
         <path d="M0 50 C 30 50, 34 34, 60 34 S 96 52, 120 46 156 26, 180 32 216 50, 240 42 276 28, 300 32" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="1"/>
         <defs><linearGradient id="hbw" x1="0" x2="1"><stop offset="0" stop-color="#7DF3C0"/><stop offset="1" stop-color="#9C8CFF" stop-opacity=".4"/></linearGradient></defs>`; return el; })(),
      h("div", {class: "hb-stat"}, h("i"), "EBENE IP", h("b", {}, "AKTIV")),
      h("div", {class: "hb-stat"}, h("i", {style: {"background": "var(--iris)"}}), "GERÄTE", h("b", {}, "6")),
      h("div", {class: "hb-stat"}, h("i", {style: {"background": "var(--amber)"}}), "PAKETE/S", h("b", {}, "3")));

    c.replaceChildren(h("div", {class: "hb-seite"},
      h("div", {class: "hb-raster"}, hero, kennzahlen, ziel, sitzung, klasse, lage, signal),
      h("p", {class: "hb-ziel"}, fa ? null : `Heute ${s.tagesziel.erledigt}/${s.tagesziel.ziel} · `, wocheZeile(s.woche))));
  }
  /* Wochenziel (§ 20 F7): frei wählbar aus drei Vorschlägen; ohne Wahl nur ein kleiner Knopf */
  function wocheZeile(w){
    if (!w) return h("button", {type: "button", class: "hb-woche-knopf", onclick: wocheWaehlen}, "Wochenziel wählen");
    return h("button", {type: "button", class: "hb-woche-knopf" + (w.erreicht ? " fertig" : ""), title: w.text + " – ändern", onclick: wocheWaehlen},
      w.erreicht ? `Woche ✓ ${w.text}` : `Woche ${w.ist}/${w.soll} ${w.kurz}`);
  }
  function wocheWaehlen(){
    const jetzt = Spiel.woche.stand();
    const zu = overlay(h("div", {class: "hb-woche"},
      h("h2", {}, "Dein Ziel für diese Woche"),
      h("p", {class: "sp-leise"}, "Eins von dreien – oder keins. Geschafft gibt +1 Ruf; verpasst kostet nichts."),
      h("div", {class: "hb-woche-wahl"}, Spiel.woche.vorschlaege().map(v => h("button", {type: "button", class: "knopf" + (jetzt && jetzt.id === v.id ? " an" : ""),
        onclick: () => { Spiel.woche.waehlen(v.id); zu(); neu(); }}, UI.symbol("ziel", 16), " " + v.text))),
      h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf geist", onclick: () => zu()}, "Später"))));
  }
  function neu(){ if (wurzel && wurzel.isConnected && !wurzel.hidden) zeigen(wurzel); }

  /* ---------- Aufwärmen: drei Mini-Karten (Lernmotor: fällige Fertigkeiten zuerst) ---------- */
  function aufwaermen(){
    const ziel = Spiel.HUB.AUFWAERMEN;
    const bereich = h("div", {class: "mk-dialog"}), stand = h("p", {class: "hb-fortschritt"}), fuss = h("div", {class: "sp-knoepfe"});
    let gezaehlt = 0;
    const zeichnen = () => {
      const n = Spiel.hub.stand().aufwaermen.erledigt;
      stand.textContent = n >= ziel ? "Aufgewärmt ✓ – jetzt sitzt der Kopf." : n ? `${n} von ${ziel} geschafft` : `${ziel} kurze Karten, etwa zwei Minuten`;
      fuss.replaceChildren(h("button", {type: "button", class: "knopf" + (n >= ziel ? " primaer" : " geist"), onclick: () => zu()}, n >= ziel ? "Fertig ✓" : "Später"));
    };
    const hoerer = d => { if (!d || !bereich.isConnected) return; gezaehlt++; Spiel.hub.aufgewaermt(); zeichnen(); };
    Bus.an("mini", hoerer);
    const zuOverlay = overlay(h("div", {class: "hb-aufwaermen"}, h("h2", {}, UI.symbol("kaffee", 20), " Aufwärmen"), stand, bereich, fuss));
    const zu = () => { Bus.aus("mini", hoerer); zuOverlay(); neu(); if (gezaehlt) UI.spiel.status(); };
    UI.karriere.miniZeichnen(bereich, {gross: true});
    zeichnen();
  }

  /* ---------- Tagesrätsel ---------- */
  function raetsel(){
    const r = Spiel.raetsel.heute();
    if (r.ergebnis) return raetselErgebnis(r.tag);
    const inst = Spiel.raetsel.starten();
    if (!inst) { UI.toast("Das Rätsel ließ sich heute nicht bauen – morgen gibt es ein neues.", "info"); return; }
    UI.spiel.oeffnen(inst.iid);
  }
  function raetselErgebnis(tag){
    const text = Spiel.raetsel.teilen(tag);
    if (!text) return;
    const zu = overlay(h("div", {class: "hb-raetsel"},
      h("h2", {}, UI.symbol("raetsel", 20), " Tagesrätsel"),
      h("pre", {class: "hb-teilen"}, text),
      h("p", {class: "sp-leise"}, "Alle mit demselben Niveau haben heute dasselbe Netz. Der Text verrät die Ursache nicht."),
      h("div", {class: "sp-knoepfe"},
        h("button", {type: "button", class: "knopf primaer", onclick: () => kopieren(text, "Ergebnis kopiert – einfach einfügen.")}, "Ergebnis kopieren"),
        h("button", {type: "button", class: "knopf geist", onclick: () => zu()}, "Schließen"))));
  }
  async function kopieren(text, ok){
    const r = await UI.kopieren(text);
    UI.toast(r ? ok : "Kopieren ging nicht – markier den Text und kopier ihn selbst.", r ? "ok" : "warn", {id: "kopieren", dauer: 3000});
    return r;
  }

  /* ---------- Fehlerdex (Abschnitt im Lernstand) ---------- */
  function dexOeffnen(){
    UI.app.ansicht("lernstand");
    requestAnimationFrame(() => document.getElementById("dex")?.scrollIntoView({block: "start", behavior: UI.bewegung() === "voll" ? "smooth" : "auto"}));
  }
  function dexAbschnitt(){
    const z = Spiel.dex.zaehlen();
    return h("section", {class: "dx-dex", id: "dex"},
      h("h3", {}, UI.symbol("dex", 18), " Fehlerdex ", h("small", {}, `${z.gesehen} gesehen · ${z.verstanden} verstanden · ${z.gesamt} Fehlerarten`)),
      h("p", {class: "sp-leise"}, "Jede Fehlerart, die du behebst, landet hier – ohne bezahlte Hilfe gelöst gilt sie als verstanden. Eine ganze Gruppe verstanden: Ehrentitel."),
      ...Spiel.dex.gruppen().map(g => h("div", {class: "dx-gruppe" + (g.fertig ? " fertig" : "")},
        h("h4", {}, g.titel, h("small", {}, ` ${g.verstanden}/${g.gesamt}`), g.fertig ? h("span", {class: "dx-titel"}, UI.symbol("trophae", 14), " " + g.ehrentitel) : null),
        h("div", {class: "dx-raster"}, g.eintraege.map(e => e.zustand === "unbekannt"
          ? h("div", {class: "dx-karte unbekannt", title: "Noch nicht begegnet"}, h("span", {class: "dx-sym", "aria-hidden": "true"}, "?"),
              h("span", {class: "dx-text"}, h("b", {}, "Unbekannt"), h("small", {}, `taucht ab Stufe ${e.ab} auf`)))
          : h("button", {type: "button", class: "dx-karte " + e.zustand, onclick: () => dexDetail(e)},
              h("span", {class: "dx-sym", "aria-hidden": "true"}, e.zustand === "verstanden" ? "✓" : "◐"),
              h("span", {class: "dx-text"}, h("b", {}, e.titel), h("small", {}, e.zustand === "verstanden" ? "verstanden" : "gesehen – mit Hilfe gelöst"))))))));
  }
  function dexDetail(e){
    UI.app.dialogOeffnen(e.titel, h("div", {class: "dx-detail"},
      h("p", {class: "dx-symptom"}, e.symptom),
      h("h3", {}, "Woran du es erkennst"), h("ul", {}, e.erkennen.map(t => h("li", {}, t))),
      h("h3", {}, "Was dahintersteckt"), h("p", {}, e.erklaerung),
      h("p", {class: "sp-leise"}, `${e.zustand === "verstanden" ? "Verstanden am " + datumDe(e.verstanden) : "Gesehen am " + datumDe(e.gesehen)} · Quelle: ${e.quelle || "–"}`)), "dialog-dex");
  }

  /* ---------- Spieltagebuch ---------- */
  function tagebuchAbschnitt(el){
    const tb = Spiel.tagebuch.daten();
    el.append(h("div", {class: "einst-zeile"},
      h("div", {class: "einst-text"}, h("strong", {}, "Auswertung kopieren"),
        h("span", {}, `Das Spiel notiert lokal Sitzungen und Aufträge (${tb.length} Einträge). Nichts verlässt den Rechner – außer du kopierst die Auswertung selbst.`)),
      h("div", {class: "einst-steuer"}, h("button", {type: "button", class: "knopf", onclick: () => tagebuchKopieren()}, "Kopieren"))));
  }
  function tagebuchKopieren(){
    const text = Spiel.tagebuch.auswertung();
    kopieren(text, "Auswertung kopiert – einfach in den Chat einfügen.");
    return text;
  }

  /* ---------- Anmeldung ---------- */
  (UI.startHaken ||= []).push(() => {
    UI.app.registrieren("heute", {titel: "Heute", symbol: "heute", zeigen, wieder: zeigen});
    UI.app.einstellungAbschnitt("Spieltagebuch", tagebuchAbschnitt);
  });
  Bus.an("zustand-geaendert", () => { if (UI.app.aktuell === "heute") neu(); });

  return {zeigen, aufwaermen, raetsel, raetselErgebnis, dexOeffnen, dexAbschnitt, dexDetail, tagebuchKopieren, kopieren};
})();
