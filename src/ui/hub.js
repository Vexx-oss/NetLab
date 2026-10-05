"use strict";
/* ---------- Hub „Heute“: die ruhige Startseite (Design – Spielspaß 2.0, Hebel 4; Architektur § 9.3) ----------
   Datumszeile und Serie · eine Karte „Nächster Auftrag“ mit dem einzigen Hauptknopf (darunter „oder:“ zwei weitere als kleine Zeilen) · drei Kacheln
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
    const zu = () => { o.classList.remove("da"); setTimeout(() => o.remove(), 180); document.removeEventListener("keydown", esc); };
    document.addEventListener("keydown", esc);
    return zu;
  }

  /* ---------- Startseite ---------- */
  function zeigen(c){
    wurzel = c;
    if (!Spiel._st) { c.replaceChildren(); return; }
    const s = Spiel.hub.stand(), n = s.naechster, fa = s.feierabend;
    const serie = s.serie.zurueck ? "Willkommen zurück!"
      : s.serie.tage ? `🔥 ${s.serie.tage} ${s.serie.tage === 1 ? "Tag" : "Tage"} Serie` + (s.serie.urlaub && s.serie.frei ? ` · noch ${s.serie.frei} freier Tag diese Woche` : s.serie.urlaub ? " · freie Tage dieser Woche genutzt" : "")
      : "Schön, dass du da bist.";
    /* Nach dem Tagesziel ersetzt der Feierabend die Auftragskarte (Platzbudget): Bilanz, ein Ausblick, Hauptknopf „Zur Leiste“ –
       wer weiterspielen will, findet „Noch einen Auftrag“ daneben */
    const weiterFn = () => { if (n.art === "leer") { const i = Spiel.nachschub(); UI.spiel.status(); if (i) UI.spiel.oeffnen(i.iid); } else UI.spiel.oeffnen(n.iid); };
    const feier = fa ? h("section", {class: "hb-feierabend"},
      h("div", {}, h("h3", {}, "🌙 Feierabend"),
        h("p", {}, `${fa.bilanz.tickets} Aufträge · Ø ${zahl(fa.bilanz.sterne)} ★ · +${eur(fa.bilanz.euro)} €`),
        h("p", {class: "hb-ausblick"}, fa.ausblick)),
      h("div", {class: "hb-feier-knoepfe"},
        h("button", {type: "button", class: "knopf primaer", title: "Das Programm wird zur kleinen Leiste am Bildschirmrand", onclick: () => UI.modus("leiste")}, "Zur Leiste"),
        h("button", {type: "button", class: "knopf geist", onclick: weiterFn}, "Noch einen Auftrag"))) : null;
    const knopfKlasse = "knopf gross primaer hb-annehmen";
    const karte = fa ? null : n.art === "leer"
      ? h("section", {class: "hb-auftrag leer"}, h("small", {}, "Postfach leer"), h("h3", {}, "Alles erledigt"),
          h("button", {type: "button", class: knopfKlasse, onclick: weiterFn}, "Neuen Auftrag holen ▸"))
      : h("section", {class: "hb-auftrag" + (n.klingelt ? " klingelt" : ""), style: {"--k": `var(${n.farbe || "--accent"})`}},
          h("span", {class: "sp-kunde-sym gross"}, n.klingelt ? "☎" : n.symbol),
          h("div", {class: "hb-auftrag-text"},
            h("small", {}, n.klingelt ? `${n.kontakt} ruft an` : n.art === "weiter" ? "Weiter mit" : "Nächster Auftrag"),
            h("h3", {}, n.titel),
            h("p", {}, `${(Spiel.FORMEN[n.form] || Spiel.FORMEN.stoerung).sym} ${(Spiel.FORMEN[n.form] || Spiel.FORMEN.stoerung).titel} · ${n.kunde} · ~${n.minuten} min · ${eur(n.euro)} €`)),
          h("button", {type: "button", class: knopfKlasse, onclick: () => UI.spiel.oeffnen(n.iid)}, n.klingelt ? "Rangehen ▸" : n.art === "weiter" ? "Weiterarbeiten ▸" : "Annehmen ▸"),
          /* § 20 F7: die Wahl aus dem Postfach – zwei weitere als kleine Zeilen (kein zweiter Hauptknopf) */
          s.weitere.length ? h("div", {class: "hb-oder"}, h("small", {}, "oder:"), s.weitere.map(w => h("button", {type: "button", class: "hb-oder-zeile", title: w.voll,
            onclick: () => UI.spiel.oeffnen(w.iid)}, h("span", {"aria-hidden": "true"}, w.klingelt ? "☎" : (Spiel.FORMEN[w.form] || Spiel.FORMEN.stoerung).sym), " ", w.titel))) : null);
    const aw = s.aufwaermen, ra = s.raetsel;
    const kachel = (sym, titel, info, fn, fertig) => h("button", {type: "button", class: "hb-kachel" + (fertig ? " fertig" : ""), onclick: fn},
      h("span", {class: "hb-kachel-sym", "aria-hidden": "true"}, sym), h("span", {class: "hb-kachel-text"}, h("b", {}, titel), h("small", {}, info)));
    const kacheln = h("div", {class: "hb-kacheln"},
      kachel("☕", "Aufwärmen", aw.erledigt >= aw.ziel ? "✓ erledigt" : aw.erledigt ? `${aw.erledigt}/${aw.ziel} Karten` : `${aw.ziel} Karten`, aufwaermen, aw.erledigt >= aw.ziel),
      kachel("🧩", `Tagesrätsel #${ra.nr}`, ra.geloest ? `✓ ${zahl(ra.sterne)} ★` : ra.laeuft ? "angefangen" : Spiel.NIVEAU_NAME[ra.niveau] || ra.niveau, raetsel, ra.geloest),
      s.post.ungelesen ? kachel("✉", "Post", `${s.post.ungelesen} neu`, () => UI.app.ansicht("postfach"))
        : kachel("📕", "Fehlerdex", `${s.dex.verstanden}/${s.dex.gesamt}`, () => dexOeffnen()));
    c.replaceChildren(h("div", {class: "hb-seite"},
      h("header", {class: "hb-kopf"}, h("h2", {}, datumText()), h("p", {class: "hb-serie"}, serie)),
      feier, karte, kacheln,
      fa ? null : h("p", {class: "hb-ziel"}, `Heute ${s.tagesziel.erledigt}/${s.tagesziel.ziel}`, " · ", wocheZeile(s.woche))));
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
        onclick: () => { Spiel.woche.waehlen(v.id); zu(); neu(); }}, "🎯 " + v.text))),
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
    const zuOverlay = overlay(h("div", {class: "hb-aufwaermen"}, h("h2", {}, "☕ Aufwärmen"), stand, bereich, fuss));
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
      h("h2", {}, "🧩 Tagesrätsel"),
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
      h("h3", {}, "📕 Fehlerdex ", h("small", {}, `${z.gesehen} gesehen · ${z.verstanden} verstanden · ${z.gesamt} Fehlerarten`)),
      h("p", {class: "sp-leise"}, "Jede Fehlerart, die du behebst, landet hier – ohne bezahlte Hilfe gelöst gilt sie als verstanden. Eine ganze Gruppe verstanden: Ehrentitel."),
      ...Spiel.dex.gruppen().map(g => h("div", {class: "dx-gruppe" + (g.fertig ? " fertig" : "")},
        h("h4", {}, g.titel, h("small", {}, ` ${g.verstanden}/${g.gesamt}`), g.fertig ? h("span", {class: "dx-titel"}, "🏆 " + g.ehrentitel) : null),
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
