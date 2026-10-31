"use strict";
/* ---------- Shop: Werkstattregal (Runde 4, Strang F) ----------
   Aus src/ui/karriere.js ausgelagert (Phase 0) und als Bento-Regel neu gebaut. Verkauft werden
   Werkzeuge (Lerninhalt), Playbooks + Slots und Aussehen; Wartungsverträge stehen in der Kundenakte,
   die Prüfungsanmeldung im Lernstand. EINE Preisquelle bleibt Spiel.shop.liste()/Spiel.PRUEFUNG.GEBUEHR.

   Grundsätze (Gestaltungsvertrag Runde 4 § 1/§ 3 Strang F, Bento 2.5):
   · Vier Warengruppen nach Aufgabe: Werkzeuge, Automatisierung, Aussehen, Wartungsverträge (Verweis).
   · Je Artikel Name, ein Satz Nutzen, Preis, Zustands-Chip (Text + Form/Symbol, Farbe nie allein)
     und genau eine Aktion; gesperrte/zu teure Artikel nennen ihren echten Grund im Klartext.
   · Empfehlung nur aus echten Daten: der günstigste Artikel, der jetzt kaufbar ist.
   · Vorschau für Aussehen als Token-Probe (echte Akzentfarbe aus Spiel.AUSSEHEN, Leistenstil als
     Mini-Skizze) – keine Fake-Bilder.
   · Kauf ab Spiel.shop.BESTAETIGUNG_AB als ruhiger Hausdialog (Esc schließt, Enter bestätigt, Fokus
     kehrt zum Auslöser zurück); der Kaufweg Spiel.shop.kaufen bleibt unverändert.
   · Keine erfundenen Zahlen: alle Anzeigen kommen aus Spiel.shop.liste()/Spiel.st/Spiel.PRUEFUNG. */
UI.shop = (() => {
  /* Zustand → Chip: Text + Form (eigenes Symbol), Farbe nur zusätzlich (bn-chip-Variante). */
  const ZUSTAND = {
    kaufbar:     {klasse: "ok",   symbol: "plus",     text: "Kaufbar"},
    "zu-teuer":  {klasse: "warn", symbol: "warnung",  text: "Zu teuer"},
    gekauft:     {klasse: "",     symbol: "ok",       text: "Gekauft"},
    aktiv:       {klasse: "ok",   symbol: "ok",       text: "Aktiv"},
    gesperrt:    {klasse: "",     symbol: "schloss",  text: "Gesperrt"},
    "kein-slot": {klasse: "warn", symbol: "schloss",  text: "Kein Slot frei"},
    veraltet:    {klasse: "warn", symbol: "warnung",  text: "Wiederholen"},
  };

  const kurz = t => String(t == null ? "" : t).replace(/^Playbook: /, "");
  /* Ein Satz Nutzen je Karte – der Vertrag nennt genau einen. Mehrsätzige Quelltexte werden
     am ersten Satzende gekürzt (der volle Text bleibt in den Daten). */
  const ersterSatz = t => {
    const s = String(t == null ? "" : t).trim();
    const i = s.indexOf(". ");
    return i > 0 ? s.slice(0, i + 1) : s;
  };

  function chip(e){
    const z = ZUSTAND[e.zustand] || ZUSTAND.gesperrt;
    return h("span", {class: "bn-chip wr-chip" + (z.klasse ? " " + z.klasse : "")},
      UI.symbol(z.symbol, 13), z.text);
  }
  /* Aktive und gekaufte Artikel zeigen keinen Preis: „0,00 €“ neben „Aktiv“ ist irreführend
     (Prüfer-1-Befund Runde 4). Die Aussage trägt der Zustands-Chip; wo eine Aktion fehlt, steht
     stattdessen der leise Zustandstext (Im Leitstand aktiv / Im Labor verfügbar …). */
  function preisZeile(e){
    if (e.preis == null || e.zustand === "aktiv" || e.zustand === "gekauft") return null;
    return h("span", {class: "wr-preis"}, eur(e.preis) + " €");
  }

  /* ---------- Kaufwege: billig direkt, ab BESTAETIGUNG_AB über den ruhigen Dialog ---------- */
  function kaufen(id, danach){
    const r = Spiel.shop.kaufen(id);
    if (r && r.ok) UI.toast(r.satz ? `„${r.satz}“` : "Gekauft.", "ok", {titel: "Erledigt"});
    else UI.toast((r && r.grund) || "Das ging nicht.", "warn");
    danach && danach();
  }

  function kaufWeg(e, c, ausloeser){
    const ab = +(Spiel.shop && Spiel.shop.BESTAETIGUNG_AB) || 100;
    if (e.preis != null && e.preis >= ab) kaufDialog(e, c, ausloeser);
    else kaufen(e.id, () => { ansicht(c); fokusAuf(e.id); });
  }

  function fokusAuf(id){
    try {
      const seite = document.querySelector('.ansicht[data-ansicht="shop"]');
      const karte = seite && seite.querySelector('[data-artikel="' + String(id) + '"]');
      if (karte && typeof karte.focus === "function") karte.focus({preventScroll: true});
    } catch (e) { /* Fokus ist Komfort, nie Bedingung */ }
  }

  /* Ruhiger Hausdialog (UI.app.dialogOeffnen): Esc schließt und gibt den Fokus zurück, Enter
     bestätigt. Die Zahlen sind echt: Preis, Konto und Restbetrag aus Spiel.st. */
  function kaufDialog(e, c, ausloeser){
    if (!UI.app || typeof UI.app.dialogOeffnen !== "function"){ kaufen(e.id, () => ansicht(c)); return; }
    try { if (ausloeser && typeof ausloeser.focus === "function") ausloeser.focus({preventScroll: true}); } catch (err) {}
    const st = Spiel.st, danach = Math.round((st.euro - e.preis) * 100) / 100;
    let fertig = false;
    const schliessen = () => { if (!fertig) UI.app.dialogZu(); };
    const bestaetigen = () => {
      if (fertig) return;
      fertig = true;
      UI.app.dialogZu();
      kaufen(e.id, () => { ansicht(c); fokusAuf(e.id); });
    };
    const kasten = UI.app.dialogOeffnen("Kauf bestätigen",
      h("div", {class: "wr-kauf"},
        h("p", {class: "wr-kauf-name"}, kurz(e.titel)),
        h("p", {class: "bn-lead"}, ersterSatz(e.text)),
        h("dl", {class: "wr-kauf-werte"},
          h("dt", {}, "Preis"), h("dd", {}, eur(e.preis) + " €"),
          h("dt", {}, "Konto"), h("dd", {}, eur(st.euro) + " €"),
          h("dt", {}, "Danach"), h("dd", {}, eur(danach) + " €")),
        h("div", {class: "wr-kauf-knoepfe"},
          h("button", {type: "button", class: "knopf geist", onclick: schliessen}, "Abbrechen"),
          h("button", {type: "button", class: "knopf primaer", onclick: bestaetigen}, "Kaufen · " + eur(e.preis) + " €"))),
      "wr-dialog");
    /* Enter bestätigt; liegt der Fokus auf einem Knopf, übernimmt dieser selbst (natives Verhalten). */
    kasten.addEventListener("keydown", ev => {
      if (ev.key !== "Enter") return;
      if (ev.target && ev.target.closest && ev.target.closest("button")) return;
      if (ev.preventDefault) ev.preventDefault();
      bestaetigen();
    });
    const knopf = kasten.querySelector(".wr-kauf-knoepfe .knopf.primaer");
    if (knopf && typeof knopf.focus === "function") {
      const fokus = () => { try { knopf.focus({preventScroll: true}); } catch (err) {} };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(fokus); else fokus();
    }
  }

  /* ---------- Artikel und Kacheln ---------- */
  function aktion(e, c){
    if (e.zustand === "kaufbar") return h("button", {type: "button", class: "knopf primaer wr-aktion",
      onclick: ev => kaufWeg(e, c, ev && ev.currentTarget)}, "Kaufen");
    if (e.zustand === "veraltet") return h("button", {type: "button", class: "knopf wr-aktion",
      onclick: () => { if (UI.lernstand && typeof UI.lernstand.training === "function") UI.lernstand.training(e.skill); }}, "Wiederholen");
    if (e.art === "aussehen" && e.zustand === "gekauft") return h("button", {type: "button", class: "knopf wr-aktion",
      onclick: ev => kaufWeg(e, c, ev && ev.currentTarget)}, "Auswählen");
    if (e.zustand === "zu-teuer" || e.zustand === "gesperrt" || e.zustand === "kein-slot")
      return h("button", {type: "button", class: "knopf wr-aktion", disabled: true, title: e.grund || "Noch nicht kaufbar."}, "Kaufen");
    return null;
  }

  function grundZeile(e, txt){
    const g = String(e.grund == null ? "" : e.grund).trim();
    if (!g || e.zustand === "gekauft" || e.zustand === "aktiv") return null;
    if (g === String(e.text == null ? "" : e.text).trim()) return null;      /* derselbe Satz steht schon oben */
    if (ersterSatz(g) === txt) return null;
    return h("p", {class: "wr-grund"}, g);
  }

  /* Karten ohne Aktion (gekauft/aktiv) bekommen eine leise Zeile statt einer leeren Fläche –
     nur echte Zustände, keine Werbung. */
  function ruheText(e){
    if (e.zustand === "aktiv") return e.art === "playbook" ? "Läuft automatisch." : "Im Leitstand aktiv.";
    if (e.zustand === "gekauft" && e.art === "werkzeug") return "Im Labor verfügbar.";
    if (e.zustand === "gekauft" && e.art === "slot") return "Alle Slots gekauft.";
    return null;
  }

  function ware(e, empfehlung, c){
    const txt = ersterSatz(e.text);
    const ruhe = ruheText(e);
    const fuss = [preisZeile(e), ruhe ? h("span", {class: "wr-ruhe"}, ruhe) : null, aktion(e, c)].filter(Boolean);
    return h("article", {class: "bn-k kr-ware wr-artikel", "data-artikel": e.id, "data-zustand": e.zustand, tabindex: "-1"},
      h("div", {class: "wr-artikel-kopf"}, chip(e),
        e.id === empfehlung ? h("span", {class: "bn-chip iris wert wr-empfehlung", title: "Günstigster Artikel, der jetzt in dein Konto passt"}, "Empfohlen") : null),
      h("h4", {class: "wr-artikel-name"}, kurz(e.titel)),
      txt ? h("p", {class: "wr-artikel-text"}, txt) : null,
      grundZeile(e, txt),
      fuss.length ? h("div", {class: "wr-artikel-fuss"}, fuss) : null);
  }

  /* Aussehen: echte Token-Probe statt Bild. Akzent = Farbe aus Spiel.AUSSEHEN als Linie/Punkt,
     Leiste = Mini-Skizze des Stils. aria-hidden, weil der Name daneben alles Nötige sagt. */
  function probe(e){
    if (e.aussehenArt === "akzent") return h("div", {class: "wr-probe", "aria-hidden": "true", style: {"--wr-farbe": e.farbe || null}},
      h("span", {class: "wr-probe-tupfer"}), h("span", {class: "wr-probe-rail"}), h("span", {class: "wr-probe-punkt"}));
    return h("div", {class: "wr-probe", "aria-hidden": "true", "data-stil": e.aussehen},
      h("div", {class: "wr-probe-leiste"}, h("i", {}), h("i", {}), h("i", {})));
  }

  function look(e, empfehlung, c){
    const txt = ersterSatz(e.text);
    return h("article", {class: "bn-k kr-ware wr-artikel wr-look", "data-artikel": e.id, "data-zustand": e.zustand, tabindex: "-1"},
      probe(e),
      h("div", {class: "wr-look-kopf"},
        h("h4", {class: "wr-artikel-name"}, kurz(e.titel)), chip(e),
        e.id === empfehlung ? h("span", {class: "bn-chip iris wert wr-empfehlung", title: "Günstigster Artikel, der jetzt in dein Konto passt"}, "Empfohlen") : null),
      txt ? h("p", {class: "wr-artikel-text"}, txt) : null,
      grundZeile(e, txt),
      h("div", {class: "wr-artikel-fuss"}, [preisZeile(e), ruheText(e) ? h("span", {class: "wr-ruhe"}, ruheText(e)) : null, aktion(e, c)].filter(Boolean)));
  }

  /* Wartungsverträge: kein zweiter Kaufweg – die Kachel verweist in die Kundenakte und nennt
     nur echte Zahlen aus der Shop-Liste. */
  function vertragKachel(vertraege){
    const laufen = vertraege.filter(e => e.zustand === "gekauft").length;
    const offen = vertraege.filter(e => e.zustand === "kaufbar").length;
    return h("div", {class: "bn-k wr-verweis"},
      h("h4", {class: "wr-artikel-name"}, "Wartungsverträge"),
      h("p", {class: "bn-lead"}, "Laufzeit, Ampel und €/h eines Vertrags stehen beim Kunden. Abgeschlossen wird er dort – so gibt es keinen zweiten Kaufweg."),
      h("dl", {class: "wr-zahlen"},
        h("dt", {}, "Laufend"), h("dd", {}, String(laufen)),
        h("dt", {}, "Angebotsreif"), h("dd", {}, String(offen)),
        h("dt", {}, "Im Bestand"), h("dd", {}, String(vertraege.length))),
      h("div", {class: "bn-fuss"},
        h("button", {type: "button", class: "knopf primaer", onclick: () => { if (UI.app && typeof UI.app.ansicht === "function") UI.app.ansicht("kunden"); }}, "Kundenakte öffnen")));
  }

  /* Prüfungsanmeldung: steht im Lernstand – hier nur der Weg dorthin, mit den echten Gebühren. */
  function pruefungKachel(){
    const G = Spiel.PRUEFUNG.GEBUEHR;
    return h("div", {class: "bn-k wr-verweis"},
      h("h4", {class: "wr-artikel-name"}, "Prüfungsanmeldung"),
      h("p", {class: "bn-lead"}, "Angemeldet wird im Lernstand. Die Gebühr bucht allein die Prüfung ab – es gibt keinen zweiten Kaufweg."),
      h("dl", {class: "wr-zahlen"},
        h("dt", {}, "AP1"), h("dd", {}, eur(G.AP1) + " €"),
        h("dt", {}, "AP2"), h("dd", {}, eur(G.AP2) + " €"),
        h("dt", {}, "Erste Prüfung"), h("dd", {}, "gebührenfrei")),
      h("div", {class: "bn-fuss"},
        h("button", {type: "button", class: "knopf primaer", onclick: () => { if (UI.app && typeof UI.app.ansicht === "function") UI.app.ansicht("lernstand"); }}, "Zum Lernstand")));
  }

  /* Eine Warengruppe: Kopf mit Titel, echtem Zähler und einem Satz, darunter das Regal. */
  function bereich(gruppe, spalten, titel, zahl, text, regalKlasse, karten, ...fuss){
    return h("section", {class: "kr-gruppe wr-bereich " + spalten, "data-gruppe": gruppe},
      h("header", {class: "wr-gruppe-kopf"},
        h("div", {class: "wr-gruppe-titelzeile"}, h("h3", {}, titel), h("span", {class: "bn-chip wert wr-gruppe-zahl"}, zahl)),
        h("p", {class: "bn-meta wr-gruppe-text"}, text)),
      karten.length ? h("div", {class: regalKlasse}, karten) : null,
      ...fuss.filter(Boolean));
  }

  /* ---------- Die Ansicht ---------- */
  function ansicht(c){
    const st = Spiel.st, liste = Spiel.shop.liste();
    const von = art => liste.filter(e => e.art === art);
    const werkzeuge = von("werkzeug"), slots = von("slot"), playbooks = von("playbook");
    const aussehen = von("aussehen"), vertraege = von("vertrag");
    const rang = {kaufbar: 0, "kein-slot": 1, veraltet: 2, aktiv: 3};
    const spielbar = playbooks.filter(e => e.zustand !== "gesperrt")
      .sort((a, b) => (rang[a.zustand] == null ? 5 : rang[a.zustand]) - (rang[b.zustand] == null ? 5 : rang[b.zustand]));
    const gesperrt = playbooks.length - spielbar.length;
    const kaufbar = liste.filter(e => e.zustand === "kaufbar" && e.preis != null);
    /* Ehrliche Empfehlung: der günstigste Artikel, der JETZT kaufbar ist – sonst keine. */
    const empfehlung = kaufbar.length ? kaufbar.slice().sort((a, b) => a.preis - b.preis)[0].id : null;
    const kaufbarAuto = slots.concat(playbooks).filter(e => e.zustand === "kaufbar").length;
    const ausGekauft = aussehen.filter(e => e.zustand === "gekauft" || e.zustand === "aktiv").length;
    const vertragAktiv = vertraege.filter(e => e.zustand === "gekauft").length;

    c.replaceChildren(h("div", {class: "kr-seite"},
      h("header", {class: "kr-kopf"},
        h("div", {class: "wr-kopf-text"},
          h("span", {class: "bn-kicker"}, "Werkstatt · Beschaffung"),
          h("h2", {}, "Werkstattregal"),
          h("p", {class: "bn-lead"}, "Werkzeuge für den Auftrag, Automatisierung für Wartung, Aussehen für den Leitstand – alles aus einer Hand.")),
        h("div", {class: "wr-konto"},
          h("span", {class: "bn-kicker"}, "Konto"),
          h("b", {class: "wr-konto-wert"}, eur(st.euro) + " €"),
          h("small", {class: "wr-konto-text"}, "Simulation, Inspektor, Hilfe und Wiki sind immer frei."))),
      h("div", {class: "bn-raster"},
        bereich("Werkzeuge", "bn-s7", "Werkzeuge", werkzeuge.length + " Artikel",
          "Lerninhalt: Werkzeuge, die du im Auftrag einsetzt.", "wr-regal wr-regal-2",
          werkzeuge.map(e => ware(e, empfehlung, c))),
        bereich("Automatisierung", "bn-s5", "Automatisierung",
          kaufbarAuto + " kaufbar · " + st.playbooks.aktiv.length + "/" + st.playbooks.slots + " belegt",
          "Playbooks erledigen Wartungs-Tickets ihrer Fertigkeit von selbst – 60 % Ertrag, ohne Lernwirkung.",
          "wr-regal", slots.concat(spielbar).map(e => ware(e, empfehlung, c)),
          gesperrt ? h("p", {class: "wr-mehr"}, UI.symbol("schloss", 13),
            " " + gesperrt + " weitere " + (gesperrt === 1 ? "Fertigkeit wird" : "Fertigkeiten werden") +
            " ab „sicher“ kaufbar – üben kannst du sie im Lernstand.") : null,
          h("p", {class: "wr-hinweis"}, "Ist eine Fertigkeit zur Wiederholung fällig, pausiert ihr Playbook, bis du sie wiederholt hast.")),
        bereich("Aussehen", "bn-s8", "Aussehen", ausGekauft + " von " + aussehen.length + " gekauft",
          "Akzentfarbe und Leiste des Leitstands. Die Vorschau zeigt den echten Wert – keine Bilder.",
          "wr-looks", aussehen.map(e => look(e, empfehlung, c))),
        bereich("Kunden", "bn-s4", "Kunden & Prüfung", vertragAktiv + " von " + vertraege.length + " Verträgen aktiv",
          "Verträge und Prüfung werden beim Kunden bzw. im Lernstand abgeschlossen – der Shop hält nur den Weg dorthin bereit.",
          "wr-regal", [vertragKachel(vertraege), pruefungKachel()]))));
  }

  return {ansicht, kaufen};
})();
(UI.startHaken ||= []).push(() => {
  UI.app.registrieren("shop", {titel: "Shop", symbol: "euro", zeigen: UI.shop.ansicht, wieder: UI.shop.ansicht});
});
Object.assign(UI.karriere, {shopAnsicht: UI.shop.ansicht, kaufen: UI.shop.kaufen});
