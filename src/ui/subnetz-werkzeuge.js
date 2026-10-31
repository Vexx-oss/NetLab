"use strict";
/* ---------- Subnetting-Werkzeuge und Lernspiele (Runde 7, W4) ----------
   Vertrag: docs/entwicklung/Entwurf – Runde 7 (Abteilung Subnetting).md § 2.4, § 3, § 7, § 8.

   UI.subnetzwerkzeuge = {
     liste()  → genau 6 Werkzeuge {id, titel, kicker, lead, skill, stufe}
     zeichnen(container, id, opts) → {zerstoeren()}   opts: {ip?, praefix?, niveau?, kompakt?, onErgebnis?}
     spiele: {
       liste()  → genau 3 Lernspiele {id, titel, kicker, lead, skill, stufe, dauerText}
       starten(container, id, opts) → {zerstoeren()}  opts: {niveau?, onEnde?, onErgebnis?}
     }
   }

   GRUNDREGEL: Jede Subnetz-Zahl kommt aus Spiel.subnetz.* (W1) – rechnen, praefixZuMaske,
   maskeZuPraefix, plan, antwort, fortschritt. Dieses Modul hat KEINE eigene Rechenquelle;
   fehlt der Kern, zeigt es einen ruhigen Hinweis statt zu werfen. Die einzige eigene Arithmetik
   ist Darstellung: Bits ↔ Dezimalwert eines Oktetts (Eingabe des Bitlabors), die Blocklänge eines
   Oktetts für das Lineal und Balkenbreiten.

   Aufbau je Werkzeug/Spiel: Kopf (Mikrolabel, Titel, Lernziel), Bühne (visuell + bedienbar),
   Ergebnisanzeige mit aria-live, Fuß mit „Aufgabe dazu" (onErgebnis {art, id, skill, geloest, hilfe}).
   Bedienelemente ≥ 44 px, Tastaturbedienung über echte Knöpfe/Regler/Auswahlfelder.
   Präfixe: sw-* (Werkzeuge), sg-* (Spiele). Kein Zufall ohne Seed, keine Emoji, keine erfundenen Zahlen. */
UI.subnetzwerkzeuge = (() => {
  /* ---------------- Werkzeugkatalog (§ 7, genau 6, feste Reihenfolge) ---------------- */
  const WERKZEUGE = [
    {id: "bitlabor", titel: "32-Bit-Labor", kicker: "Bit-Sicht",
     lead: "Sieh, wie 32 Bit zu vier Oktetten werden und wo die Netzmaske den Netzanteil abtrennt.",
     skill: "lab.subnetz", stufe: "E"},
    {id: "maskenleiste", titel: "Masken-Schieber", kicker: "Präfix ↔ Maske",
     lead: "Schiebe den Präfix von 0 bis 32 und lies Maske, Blockgröße und Hostzahl direkt ab.",
     skill: "lab.subnetz", stufe: "E"},
    {id: "blocklineal", titel: "Blocklineal", kicker: "Blockgrenzen",
     lead: "Ordne eine Adresse ihrem Block zu und raste sie an der Netz-ID ein.",
     skill: "lab.subnetz", stufe: "E"},
    {id: "rechner", titel: "Rechenweg-Assistent", kicker: "Schritt für Schritt",
     lead: "Gehe den Rechenweg einer Subnetzaufgabe einmal sicher durch und prüfe dich selbst.",
     skill: "lab.subnetz", stufe: "AP1"},
    {id: "vlsm", titel: "Adressplaner", kicker: "VLSM",
     lead: "Verteile ein Basisnetz auf Abteilungen – vom größten zum kleinsten Bedarf, mit Reserve.",
     skill: "lab.subnetz", stufe: "AP1"},
    {id: "vlan", titel: "VLAN-Werkzeug", kicker: "Access und Trunk",
     lead: "Konfiguriere acht Switch-Ports und sieh, welche Frames ankommen und welche getrennt bleiben.",
     skill: "lab.vlan", stufe: "AP1"},
  ];

  /* ---------------- Spielkatalog (§ 8, genau 3, feste Reihenfolge) ---------------- */
  const SPIELE = [
    {id: "praefix-blitz", titel: "Präfix-Blitz", kicker: "60 Sekunden",
     lead: "Übersetze Präfix, Maske und nutzbare Hosts gegeneinander – so schnell es sicher geht.",
     skill: "lab.subnetz", stufe: "AP1", dauerText: "60 Sekunden"},
    {id: "netz-sortierer", titel: "Netz-Sortierer", kicker: "Netze zuordnen",
     lead: "Ordne acht Adressen ihren drei Netzen zu und löse am Ende jeden Fall mit Rechenweg auf.",
     skill: "lab.subnetz", stufe: "E", dauerText: "ohne Zeitdruck"},
    {id: "vlan-patcher", titel: "VLAN-Patcher", kicker: "Ports konfigurieren",
     lead: "Stelle die acht Ports so ein, dass die Anforderung des Szenarios erfüllt ist.",
     skill: "lab.vlan", stufe: "AP1", dauerText: "ohne Zeitdruck"},
  ];

  /* ---------------- Zugriff auf den EINEN Rechenkern (W1) ---------------- */
  function kern(){
    try { return (typeof Spiel !== "undefined" && Spiel.subnetz) || null; } catch (e) { return null; }
  }
  function hat(name){
    const s = kern();
    return !!(s && typeof s[name] === "function");
  }
  function ruf(name, ...args){
    const s = kern();
    if (!s || typeof s[name] !== "function") return null;
    try { return s[name](...args); } catch (e) { console.error("Spiel.subnetz." + name, e); return null; }
  }

  /* ---------------- kleine Helfer (DOM, Format, Darstellung) ---------------- */
  function E(tag, klasse, ...kinder){
    const el = h(tag, klasse ? {class: klasse} : {});
    for (const kind of kinder.flat(Infinity)) if (kind != null && kind !== false) el.append(kind);
    return el;
  }
  function K(text, klasse, onklick, extra){
    return h("button", Object.assign({type: "button", class: "knopf" + (klasse ? " " + klasse : ""), onclick: onklick}, extra || {}), text);
  }
  function txt(x){ return String(x == null ? "" : x); }
  function ziffer(x, min, max, ersatz){
    const n = Math.round(Number(x));
    return Number.isFinite(n) && n >= min && n <= max ? n : ersatz;
  }
  function ipGueltig(x){
    const t = txt(x).trim();
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(t) ? t : null;
  }
  function oktetteVon(ip){
    return txt(ip).trim().split(".").map(z => ziffer(z, 0, 255, 0));
  }
  function ipAusZahlen(zahlen){ return zahlen.map(z => txt(z)).join("."); }
  function praefixZahl(x, ersatz){ return ziffer(x, 0, 32, ersatz); }
  function ipZahl(ip){ return oktetteVon(ip).reduce((a, b) => a * 256 + b, 0); }
  /* Blocklänge im gewählten Oktett aus der Blockgröße des Kerns – reine Lineal-Geometrie.
     null heißt: In diesem Oktett liegt keine Blockgrenze (Block größer als ein Oktettwert
     oder feiner als die Oktettauflösung). */
  function blockImOktett(blockGroesse, oktett){
    const faktor = Math.pow(256, 4 - oktett);
    const b = Number(blockGroesse);
    if (!Number.isFinite(b) || b <= 0 || b % faktor !== 0) return null;
    const laenge = b / faktor;
    return laenge >= 256 ? 256 : laenge;
  }
  function ergebnisKasten(){
    return h("div", {class: "sw-ergebnis", "aria-live": "polite", role: "status"});
  }
  /* Ergebnis-Paare als Raster: der Wrapper .sw-werte ist die zweispaltige Grid-Fläche (S2). */
  function zeigePaare(kasten, paare){
    kasten.replaceChildren(E("div", "sw-werte", paare.filter(Boolean).map(([label, wert]) =>
      E("div", "sw-wert", E("span", "sw-wert-label", label), E("span", "sw-wert-zahl", txt(wert))))));
  }
  /* Ergebniszeilen aus der API-Antwort. Bei /31 (RFC 3021) gibt es KEINE Netz-ID und KEINEN
     Broadcast – beide Adressen sind Endpunkte; bei /32 eine einzige Adresse (D1). */
  function ergebnisPaare(r){
    const paare = [["Adresse", txt(r.ip) + " /" + txt(r.praefix)], ["Maske", r.maske]];
    if (r.praefix >= 31) {
      if (r.praefix === 31) paare.push(["Endpunkt A", r.ersterHost], ["Endpunkt B", r.letzterHost]);
      else paare.push(["Einzige Adresse", r.ersterHost]);
      paare.push(["Nutzbare Adressen", r.hosts], ["Blockgröße", txt(r.blockGroesse) + " Adressen"],
        ["Hinweis", r.praefix === 31
          ? "/31: keine Netz-ID und keine Broadcastadresse (RFC 3021). Beide Adressen sind Endpunkte."
          : "/32: genau eine Adresse; Netz- und Broadcastbereich fallen weg."]);
    } else {
      paare.push(["Netz-ID", r.netz], ["Broadcast", r.broadcast],
        ["Erster Host", r.ersterHost], ["Letzter Host", r.letzterHost],
        ["Nutzbare Hosts", r.hosts], ["Blockgröße", txt(r.blockGroesse) + " Adressen"]);
    }
    paare.push(["Netzanteil", txt(r.netzBits) + " Bit"], ["Hostanteil", txt(r.hostBits) + " Bit"]);
    return paare;
  }
  function lernkernHinweis(){
    return E("p", "sw-hinweis", "Der Rechenkern Spiel.subnetz ist noch nicht geladen. Sobald er bereitsteht, rechnet dieses Werkzeug hier weiter.");
  }
  function rechenFehler(kasten){
    kasten.replaceChildren(E("p", "sw-hinweis", "Der Rechenkern liefert zu dieser Eingabe keine Werte. Prüfe IP-Adresse und Präfix."));
  }
  function feld(label, steuer){
    return E("div", "sw-feld", E("span", "sw-feld-label", label), steuer);
  }
  function textFeld(klasse, wert, label, platzhalter){
    return h("input", {type: "text", class: klasse, value: txt(wert), "aria-label": label, placeholder: platzhalter || "", autocomplete: "off"});
  }
  function schieber({min, max, wert, label, oninput}){
    const eingabe = h("input", {type: "range", class: "sw-regler", min: txt(min), max: txt(max), step: "1",
      value: txt(wert), "aria-label": label});
    const ausgabe = h("output", {class: "sw-regler-wert"}, txt(wert));
    const zeile = E("div", "sw-steuer", E("span", "sw-feld-label", label), eingabe, ausgabe);
    eingabe.addEventListener("input", ev => {
      const roh = ev && ev.target && ev.target.value != null ? ev.target.value : eingabe.value;
      const v = ziffer(roh, min, max, wert);
      ausgabe.textContent = txt(v);
      oninput(v);
    });
    return {zeile, eingabe, ausgabe, setzen(v){ eingabe.value = txt(v); ausgabe.textContent = txt(v); }};
  }
  function auswahl(optionen, wert, label){
    const el = h("select", {class: "sw-wahl", "aria-label": label});
    for (const o of optionen) el.append(h("option", {value: txt(o.wert)}, o.text));
    el.value = txt(wert);
    return el;
  }
  const PRAEFIX_OPTIONEN = Array.from({length: 33}, (_, i) => ({wert: i, text: "/" + i}));

  /* ---------------- gemeinsamer Rahmen der Werkzeuge ---------------- */
  function werkzeugKopf(meta){
    return E("div", "sw-kopf",
      E("p", "sw-kicker", "Werkzeug · " + meta.kicker),
      E("h3", "sw-titel", meta.titel),
      E("p", "sw-lernziel", "Lernziel: " + meta.lead));
  }
  /* Kompakt (Lektion, .sn-visual): EINE Mikrozeile statt eines zweiten Kopfes (S1). */
  function werkzeugMikroKopf(meta){
    return E("div", "sw-kopf-mikro",
      E("span", "sw-kicker", "Werkzeug · " + meta.kicker),
      E("span", "sw-mikro-titel", meta.titel));
  }
  /* Fuß nur, wenn der Aufrufer selbst Aktionen mitgibt. In der Abteilung (W3) trägt die Kopfzeile
     „Aufgabe dazu“ und „Zurück zu den Werkzeugen“; dort wird der Fuß weggelassen (S1: keine
     doppelten oder toten Knöpfe). */
  function werkzeugFuss(meta, opts){
    const knoepfe = [];
    if (typeof opts.onErgebnis === "function") {
      knoepfe.push(K("Aufgabe dazu", "sw-aufgabe", () => {
        try { opts.onErgebnis({art: "werkzeug", id: meta.id, skill: meta.skill, geloest: true, hilfe: true}); }
        catch (e) { console.error("onErgebnis", e); }
      }, {"aria-label": "Aufgabe zum Werkzeug " + meta.titel}));
    }
    if (typeof opts.onZurueck === "function") {
      knoepfe.push(K("Zurück", "sw-zurueck", () => {
        try { opts.onZurueck({art: "zurueck", id: meta.id}); } catch (e) { console.error("onZurueck", e); }
      }));
    }
    return knoepfe.length ? E("div", "sw-fuss", knoepfe) : null;
  }
  function baueWerkzeug(buehne, meta, opts){
    const bau = WERKZEUG_BAU[meta.id];
    if (typeof bau !== "function") { buehne.append(E("p", "sw-hinweis", "Dieses Werkzeug gibt es nicht.")); return; }
    bau(buehne, opts || {}, meta);
  }

  /* ---------------- 1 · Bitlabor ---------------- */
  function werkzeugBitlabor(buehne, opts){
    const start = ipGueltig(opts.ip) || "192.168.10.0";
    const bits = [];
    for (const z of oktetteVon(start)) for (let i = 7; i >= 0; i--) bits.push(((z >> i) & 1) === 1);
    let praefix = praefixZahl(opts.praefix, 26);
    const ergebnis = ergebnisKasten();
    const bitten = [], oktettWerte = [];
    const flaeche = E("div", "sw-bits");
    for (let o = 0; o < 4; o++) {
      const wert = E("span", "sw-oktett-wert", "0");
      oktettWerte.push(wert);
      const reihe = E("div", "sw-bit-reihe");
      for (let i = 0; i < 8; i++) {
        const index = o * 8 + i;
        const b = K("0", "sw-bit", () => { bits[index] = !bits[index]; merken(); });
        bitten.push(b);
        reihe.append(b);
      }
      flaeche.append(E("div", "sw-oktett",
        E("div", "sw-oktett-kopf", E("span", "sw-oktett-name", "Oktett " + (o + 1)), wert), reihe));
    }
    const legende = E("div", "sw-legende",
      E("span", "sw-legende-punkt sw-bit-netz", ""), E("span", "sw-legende-text", ""));
    const sch = schieber({min: 0, max: 32, wert: praefix, label: "Präfix (Netzanteil)",
      oninput(v){ praefix = v; merken(); }});
    buehne.append(flaeche, sch.zeile, legende, ergebnis);
    function oktetteAktuell(){
      const zahlen = [];
      for (let o = 0; o < 4; o++) {
        let z = 0;
        for (let i = 0; i < 8; i++) if (bits[o * 8 + i]) z += 128 >> i;
        zahlen.push(z);
      }
      return zahlen;
    }
    function merken(){
      const zahlen = oktetteAktuell();
      for (let o = 0; o < 4; o++) oktettWerte[o].textContent = txt(zahlen[o]);
      for (let i = 0; i < 32; i++) {
        const b = bitten[i], an = bits[i], netz = i < praefix;
        b.setAttribute("aria-pressed", an ? "true" : "false");
        b.className = "knopf sw-bit " + (netz ? "sw-bit-netz" : "sw-bit-host");
        b.textContent = an ? "1" : "0";
        b.setAttribute("aria-label", "Oktett " + (Math.floor(i / 8) + 1) + ", Bit " + (128 >> (i % 8)) +
          ": " + (an ? "an" : "aus") + (netz ? ", Netzanteil" : ", Hostanteil"));
      }
      legende.querySelector(".sw-legende-text").textContent =
        "Netzanteil: " + praefix + " Bit · Hostanteil: " + (32 - praefix) + " Bit";
      if (!hat("rechnen")) { ergebnis.replaceChildren(lernkernHinweis()); return; }
      const r = ruf("rechnen", ipAusZahlen(zahlen), praefix);
      if (!r) { rechenFehler(ergebnis); return; }
      zeigePaare(ergebnis, ergebnisPaare(r));
    }
    merken();
  }

  /* ---------------- 2 · Masken-Schieber ---------------- */
  function werkzeugMaskenleiste(buehne, opts){
    let praefix = praefixZahl(opts.praefix, 26);
    const ergebnis = ergebnisKasten();
    const binarmaske = E("div", "sw-binarmaske");
    const sch = schieber({min: 0, max: 32, wert: praefix, label: "Präfix (0 bis 32)",
      oninput(v){ praefix = v; merken(); }});
    const minus = K("-1", "sw-taste", () => { praefix = Math.max(0, praefix - 1); sch.setzen(praefix); merken(); },
      {"aria-label": "Präfix um eins verringern"});
    const plus = K("+1", "sw-taste", () => { praefix = Math.min(32, praefix + 1); sch.setzen(praefix); merken(); },
      {"aria-label": "Präfix um eins erhöhen"});
    const beschriftung = E("p", "sw-hinweis", "Der Präfix zählt die Einsen der Netzmaske von links. Jede Eins nimmt einem Oktett ein Bit für den Netzanteil.");
    buehne.append(sch.zeile, E("div", "sw-tasten", minus, plus), binarmaske, beschriftung, ergebnis);
    function merken(){
      binarmaske.replaceChildren(...Array.from({length: 32}, (_, i) => {
        const an = i < praefix;
        return E("span", "sw-mbit " + (an ? "sw-mbit-netz" : "sw-mbit-host"), an ? "1" : "0");
      }));
      if (!hat("rechnen")) { ergebnis.replaceChildren(lernkernHinweis()); return; }
      const r = ruf("rechnen", "192.168.10.0", praefix);
      if (!r) { rechenFehler(ergebnis); return; }
      const tabelle = h("table", {class: "sw-tabelle"});
      tabelle.append(h("tbody", {}, [
        ["Präfix", "/" + txt(r.praefix)],
        ["Maske (dotted)", r.maske],
        ["Blockgröße", txt(r.blockGroesse) + " Adressen"],
        ["Nutzbare Hosts", txt(r.hosts)],
        ["Netzanteil", txt(r.netzBits) + " Bit"],
        ["Hostanteil", txt(r.hostBits) + " Bit"],
      ].map(([a, b]) => h("tr", {}, h("th", {}, a), h("td", {}, txt(b))))));
      ergebnis.replaceChildren(E("p", "sw-maske", txt(r.maske)), tabelle,
        E("p", "sw-binarlabel", "Binär: " + "1".repeat(praefix) + "0".repeat(32 - praefix)));
    }
    merken();
  }

  /* ---------------- 3 · Blocklineal ---------------- */
  function werkzeugBlocklineal(buehne, opts){
    const okt = oktetteVon(ipGueltig(opts.ip) || "192.168.10.70");
    let praefix = praefixZahl(opts.praefix, 26);
    let oktett = 4;
    const ergebnis = ergebnisKasten();
    const hinweis = E("p", "sw-hinweis", "");
    const adresse = E("div", "sw-adresse");
    const oktKnoepfe = [];
    for (let i = 0; i < 4; i++) {
      const b = K(txt(okt[i]), "sw-adresse-oktett", () => { oktett = i + 1; anzeigen(); },
        {"aria-label": "Oktett " + (i + 1) + " bearbeiten", "aria-pressed": i === 3 ? "true" : "false"});
      oktKnoepfe.push(b);
      adresse.append(b);
      if (i < 3) adresse.append(E("span", "sw-adresse-punkt", "."));
    }
    const wahl = auswahl(PRAEFIX_OPTIONEN, praefix, "Präfix wählen");
    wahl.addEventListener("change", () => { praefix = praefixZahl(wahl.value, praefix); anzeigen(); });
    const lineal = h("div", {class: "sw-lineal", role: "img",
      "aria-label": "Blocklineal mit Blockgrenzen"});
    const leiste = h("input", {type: "range", class: "sw-adressleiste", min: "0", max: "255", step: "1",
      value: txt(okt[3]), "aria-label": "Adressleiste 0 bis 255"});
    leiste.addEventListener("input", () => {
      okt[oktett - 1] = ziffer(leiste.value, 0, 255, okt[oktett - 1]);
      anzeigen();
    });
    const einrasten = K("Einrasten", "sw-taste", () => {
      const r = ruf("rechnen", ipAusZahlen(okt), praefix);
      if (r && ipGueltig(r.netz)) { oktetteVon(r.netz).forEach((z, i) => { okt[i] = z; }); anzeigen(); }
    }, {"aria-label": "Adresse auf die Netz-ID einrasten"});
    const blockende = K("Blockende", "sw-taste", () => {
      const r = ruf("rechnen", ipAusZahlen(okt), praefix);
      if (r && ipGueltig(r.broadcast)) { oktetteVon(r.broadcast).forEach((z, i) => { okt[i] = z; }); anzeigen(); }
    }, {"aria-label": "Adresse auf die letzte Adresse des Blocks setzen"});
    buehne.append(E("div", "sw-steuer", feld("Präfix", wahl), adresse), leiste, lineal,
      E("div", "sw-tasten", einrasten, blockende), hinweis, ergebnis);
    /* HTML-Lineal statt SVG: so nutzt es die VOLLE Breite des Containers (S9). Positionen sind
       Prozentwerte, Blockgrenzen und Marker bleiben proportional; Text wird nicht verzerrt. */
    function zeichneLineal(r){
      lineal.replaceChildren();
      const wert = okt[oktett - 1];
      const laenge = blockImOktett(r.blockGroesse, oktett);
      if (laenge == null) {
        hinweis.textContent = "Im " + oktett + ". Oktett liegt keine Blockgrenze: Die Blockgröße beträgt " +
          txt(r.blockGroesse) + " Adressen, die Grenze liegt im " + txt(r.oktett) + ". Oktett.";
        return;
      }
      hinweis.textContent = "Blockgröße " + txt(r.blockGroesse) + " Adressen · im " + oktett +
        ". Oktett " + (laenge >= 256 ? "eine einzige Grenze bei 0" : laenge + " Adressen je Block") + ".";
      const prozent = x => (x / 256) * 100;
      const anzahl = Math.max(1, Math.round(256 / laenge));
      if (laenge >= 4) {
        for (let k = 0; k < anzahl; k++) {
          const x = k * laenge;
          const band = E("div", "sw-block" + (k % 2 ? " sw-block-alt" : "") +
            (wert >= x && wert < x + laenge ? " sw-block-aktiv" : ""));
          band.setAttribute("style", "left:" + prozent(x) + "%;width:" + prozent(laenge) + "%");
          lineal.append(band);
        }
      }
      for (let k = 0; k <= anzahl; k++) {
        const grenze = E("div", "sw-grenze");
        grenze.setAttribute("style", "left:" + prozent(k * laenge) + "%");
        lineal.append(grenze);
      }
      const sprünge = Math.max(1, Math.ceil(anzahl / 8));
      for (let k = 0; k < anzahl; k += sprünge) {
        const label = E("span", "sw-label", txt(k * laenge));
        label.setAttribute("style", "left:" + prozent(k * laenge) + "%");
        lineal.append(label);
      }
      const marker = E("div", "sw-marker");
      marker.setAttribute("style", "left:" + prozent(Math.min(255, wert)) + "%");
      lineal.append(marker);
      const markerLabel = E("span", "sw-marker-label", txt(wert));
      markerLabel.setAttribute("style", "left:" + prozent(Math.min(255, wert)) + "%");
      lineal.append(markerLabel);
    }
    function anzeigen(){
      for (let i = 0; i < 4; i++) {
        oktKnoepfe[i].textContent = txt(okt[i]);
        oktKnoepfe[i].setAttribute("aria-pressed", i + 1 === oktett ? "true" : "false");
      }
      leiste.value = txt(okt[oktett - 1]);
      if (!hat("rechnen")) {
        lineal.replaceChildren();
        hinweis.textContent = "";
        ergebnis.replaceChildren(lernkernHinweis());
        return;
      }
      const r = ruf("rechnen", ipAusZahlen(okt), praefix);
      if (!r) { lineal.replaceChildren(); rechenFehler(ergebnis); return; }
      zeichneLineal(r);
      zeigePaare(ergebnis, ergebnisPaare(r));
    }
    anzeigen();
  }

  /* ---------------- 4 · Rechenweg-Assistent ---------------- */
  function werkzeugRechner(buehne, opts){
    let praefix = praefixZahl(opts.praefix, 26);
    let rechenweg = null, schritt = 0, daten = null;
    const ipFeld = textFeld("sw-ip-feld", ipGueltig(opts.ip) || "192.168.10.70", "IP-Adresse", "192.168.10.70");
    const wahl = auswahl(PRAEFIX_OPTIONEN, praefix, "Präfix wählen");
    const uebernehmen = K("Übernehmen", "sw-taste", rechnen);
    const rueck = E("p", "sw-rueckmeldung", "IP-Adresse und Präfix eintragen, dann „Übernehmen“.");
    rueck.setAttribute("aria-live", "polite");
    const fortschritt = E("p", "sw-fortschritt", "");
    const schritte = h("div", {class: "sw-schritte", "aria-live": "polite", "aria-relevant": "additions", role: "log"});
    const ergebnis = ergebnisKasten();
    const weiter = K("Nächster Schritt", "sw-taste sw-weiter", naechsterSchritt);
    const selbstHinweis = E("p", "sw-feld-label", "Selbst rechnen: Netz-ID und Broadcast eintragen");
    const feldA = E("div", "sw-feld", E("span", "sw-feld-label", "Netz-ID"),
      textFeld("sw-ip-feld", "", "Deine Netz-ID", "z. B. 192.168.10.64"));
    const feldB = E("div", "sw-feld", E("span", "sw-feld-label", "Broadcast"),
      textFeld("sw-ip-feld", "", "Dein Broadcast", "z. B. 192.168.10.127"));
    const selbst = E("div", "sw-selbst", selbstHinweis, feldA, feldB,
      K("Prüfen", "sw-taste sw-selbst-pruefen", pruefenSelbst));
    const selbstFelder = selbst.querySelectorAll(".sw-ip-feld");
    const selbstLabelA = feldA.querySelector(".sw-feld-label");
    const selbstLabelB = feldB.querySelector(".sw-feld-label");
    buehne.append(E("div", "sw-steuer", feld("IP-Adresse", ipFeld), feld("Präfix", wahl), uebernehmen),
      rueck, fortschritt, weiter, schritte, ergebnis, selbst);
    function rechnen(){
      const ip = ipGueltig(ipFeld.value);
      if (!ip) {
        rueck.className = "sw-rueckmeldung sw-bad";
        rueck.textContent = "Bitte eine IP-Adresse wie 192.168.10.70 eingeben.";
        return;
      }
      praefix = praefixZahl(wahl.value, praefix);
      if (!hat("rechnen")) { ergebnis.replaceChildren(lernkernHinweis()); return; }
      const r = ruf("rechnen", ip, praefix);
      if (!r) { rechenFehler(ergebnis); rueck.className = "sw-rueckmeldung sw-bad"; rueck.textContent = "Diese Eingabe kann der Rechenkern nicht lesen."; return; }
      rechenweg = Array.isArray(r.schritte) ? r.schritte : [];
      daten = r;
      /* /31 und /32 haben keinen Broadcast: die Selbstrechnen-Felder werden passend benannt (D1). */
      if (r.praefix >= 31) {
        const zwei = r.praefix === 31;
        selbstHinweis.textContent = zwei
          ? "Selbst rechnen: beide Endpunkte eintragen (RFC 3021)"
          : "Selbst rechnen: die eine Adresse eintragen";
        selbstLabelA.textContent = zwei ? "Endpunkt A" : "Adresse";
        selbstLabelB.textContent = zwei ? "Endpunkt B" : "entfällt (/32)";
        selbstFelder[1].disabled = !zwei;
        if (!zwei) selbstFelder[1].value = "";
      } else {
        selbstHinweis.textContent = "Selbst rechnen: Netz-ID und Broadcast eintragen";
        selbstLabelA.textContent = "Netz-ID";
        selbstLabelB.textContent = "Broadcast";
        selbstFelder[1].disabled = false;
      }
      schritt = 0;
      schritte.replaceChildren();
      ergebnis.replaceChildren(E("p", "sw-hinweis", "Noch nicht alle Schritte gezeigt – der Rechenweg baut sich Schritt für Schritt auf."));
      fortschritt.textContent = "Schritt 0 von " + rechenweg.length;
      weiter.disabled = rechenweg.length === 0;
      rueck.className = "sw-rueckmeldung";
      rueck.textContent = "Übernommen: " + ip + " /" + praefix + ". Jetzt Schritt für Schritt.";
      if (rechenweg.length === 0) abschluss(r);
    }
    function naechsterSchritt(){
      if (!rechenweg) { rechnen(); if (!rechenweg) return; }
      if (schritt >= rechenweg.length) return;
      const s = rechenweg[schritt];
      schritte.append(E("div", "sw-schritt",
        E("div", "sw-schritt-kopf", E("span", "sw-schritt-nr", txt(schritt + 1)), E("span", "sw-schritt-titel", txt(s.titel))),
        E("p", "sw-schritt-text", txt(s.text)),
        E("p", "sw-schritt-ergebnis", "→ " + txt(s.ergebnis))));
      schritt += 1;
      fortschritt.textContent = "Schritt " + schritt + " von " + rechenweg.length;
      if (schritt >= rechenweg.length) {
        weiter.disabled = true;
        abschluss();
      }
    }
    function abschluss(r){
      r = r || daten;
      if (!r) return;
      zeigePaare(ergebnis, ergebnisPaare(r));
      rueck.className = "sw-rueckmeldung";
      rueck.textContent = "Rechenweg vollständig. Vergleiche jetzt deine eigene Rechnung damit.";
    }
    function pruefenSelbst(){
      if (!rechenweg) { rechnen(); if (!rechenweg) return; }
      const ip = ipGueltig(ipFeld.value) || txt(ipFeld.value).trim();
      if (!hat("rechnen")) return;
      const r = ruf("rechnen", ip, praefixZahl(wahl.value, praefix));
      if (!r) return;
      const gleich = x => txt(x).replace(/\s+/g, "");
      const sollA = r.praefix >= 31 ? r.ersterHost : r.netz;
      const sollB = r.praefix >= 31 ? r.letzterHost : r.broadcast;
      const aOk = gleich(selbstFelder[0].value) === gleich(sollA);
      const bOk = r.praefix >= 32 ? true : gleich(selbstFelder[1].value) === gleich(sollB);
      const ok = aOk && bOk;
      rueck.className = "sw-rueckmeldung " + (ok ? "sw-ok" : "sw-bad");
      rueck.textContent = ok
        ? "Richtig: " + (r.praefix >= 31 ? "die Endpunkte stimmen." : "Netz-ID und Broadcast stimmen.")
        : "Noch nicht: " + selbstLabelA.textContent + " " + (aOk ? "stimmt" : "stimmt nicht") +
          (r.praefix >= 32 ? "." : ", " + selbstLabelB.textContent + " " + (bOk ? "stimmt" : "stimmt nicht") +
          (r.praefix >= 31 ? "." : ". Der Block beginnt an der Netz-ID und endet eine Adresse vor dem nächsten Block."));
      if (typeof opts.onErgebnis === "function" && ok) {
        try { opts.onErgebnis({art: "werkzeug", id: "rechner", skill: "lab.subnetz", geloest: true, hilfe: false}); }
        catch (e) { console.error("onErgebnis", e); }
      }
    }
    rechnen();
  }

  /* ---------------- 5 · Adressplaner (VLSM) ---------------- */
  function werkzeugVlsm(buehne, opts){
    const basisFeld = textFeld("sw-ip-feld", "192.168.10.0/24", "Basisnetz als IP mit Präfix", "192.168.10.0/24");
    let zeilen = [
      {name: "Verwaltung", hosts: 50},
      {name: "Technik", hosts: 26},
      {name: "Gäste", hosts: 10},
    ];
    const bedarf = E("div", "sw-bedarf");
    const ergebnis = ergebnisKasten();
    const rueck = E("p", "sw-rueckmeldung", "");
    rueck.setAttribute("aria-live", "polite");
    const plan = E("div", "sw-plan");
    const planTabelle = E("div", "sw-plan-tabelle");
    const erzeugen = K("Plan erzeugen", "sw-taste sw-plan-knopf", erzeugenPlan);
    const hinzu = K("Zeile hinzufügen", "sw-taste", () => {
      zeilenAktualisieren();
      zeilen.push({name: "Abteilung " + (zeilen.length + 1), hosts: 10});
      bedarfZeichnen();
    });
    buehne.append(E("div", "sw-steuer", feld("Basisnetz", basisFeld), erzeugen, hinzu),
      E("p", "sw-hinweis", "Trage je Abteilung den Hostbedarf ein. Der Planer sortiert vom größten zum kleinsten Bedarf und lässt die Reserve am Ende frei."),
      bedarf, rueck, plan, planTabelle, ergebnis);
    function zeilenAktualisieren(){
      const felder = bedarf.querySelectorAll(".sw-bedarf-zeile");
      felder.forEach((zeile, i) => {
        if (!zeilen[i]) return;
        const name = zeile.querySelector(".sw-name-feld");
        const hosts = zeile.querySelector(".sw-hosts-feld");
        zeilen[i].name = txt(name && name.value).trim() || zeilen[i].name;
        zeilen[i].hosts = ziffer(hosts && hosts.value, 1, 65000, zeilen[i].hosts);
      });
    }
    function bedarfZeichnen(){
      bedarf.replaceChildren(...zeilen.map((z, i) => {
        const name = textFeld("sw-name-feld", z.name, "Name der Abteilung", "Abteilung");
        const hosts = h("input", {type: "number", class: "sw-hosts-feld", min: "1", max: "65000",
          value: txt(z.hosts), "aria-label": "Hostbedarf " + z.name});
        const weg = K("Entfernen", "sw-zeile-weg", () => {
          zeilenAktualisieren();
          zeilen.splice(i, 1);
          bedarfZeichnen();
        }, {"aria-label": "Zeile " + (i + 1) + " entfernen"});
        return E("div", "sw-bedarf-zeile", name, hosts, weg);
      }));
    }
    function erzeugenPlan(){
      zeilenAktualisieren();
      const basis = txt(basisFeld.value).trim();
      if (!hat("plan")) { ergebnis.replaceChildren(lernkernHinweis()); return; }
      const antwort = ruf("plan", basis, zeilen.map(z => ({name: z.name, hosts: z.hosts})));
      if (!antwort) {
        rueck.className = "sw-rueckmeldung sw-bad";
        rueck.textContent = "Der Rechenkern liefert zu diesem Basisnetz keinen Plan. Prüfe die Schreibweise, zum Beispiel 192.168.10.0/24.";
        plan.replaceChildren();
        planTabelle.replaceChildren();
        return;
      }
      if (!antwort.ok) {
        rueck.className = "sw-rueckmeldung sw-bad";
        rueck.textContent = "Kein Plan möglich: " + txt(antwort.fehler || "Der Bedarf passt nicht in das Basisnetz.");
        plan.replaceChildren();
        planTabelle.replaceChildren();
        ergebnis.replaceChildren();
        return;
      }
      rueck.className = "sw-rueckmeldung sw-ok";
      rueck.textContent = "Plan erzeugt: " + antwort.zeilen.length + " Netze, vom größten zum kleinsten Bedarf sortiert.";
      planZeichnen(basis, antwort);
      planTabelle.replaceChildren(planTabelleBauen(antwort));
      zeigePaare(ergebnis, [
        ["Netze im Plan", String(antwort.zeilen.length)],
        ["Bedarf gesamt", txt(zeilen.reduce((s, z) => s + z.hosts, 0)) + " Hosts"],
        ["Reserve", planReserveText(basis, antwort)],
      ]);
    }
    /* Reserve ausschließlich aus API-Zahlen: Basisgröße über rechnen(basis), Blockgröße jeder
       Planzeile über rechnen(von, praefix). Keine Arithmetik auf IP-Strings (D2). */
    function planZahlen(basis, antwort){
      const teile = txt(basis).split("/");
      const ip = ipGueltig(teile[0]);
      const p = praefixZahl(teile[1], -1);
      if (!ip || p < 0) return null;
      const rBasis = ruf("rechnen", ip, p);
      if (!rBasis) return null;
      const karte = Array.isArray(antwort.karte) ? antwort.karte : [];
      const zeilen = [];
      let belegt = 0;
      for (const k of karte) {
        const r = ruf("rechnen", txt(k.von), ziffer(k.praefix, 0, 32, p));
        if (!r) return null;
        const laenge = Number(r.blockGroesse) || 0;
        belegt += laenge;
        zeilen.push({karte: k, laenge});
      }
      const gesamt = Number(rBasis.blockGroesse) || 0;
      return {gesamt, belegt, reserve: gesamt - belegt, zeilen};
    }
    function planReserveText(basis, antwort){
      const z = planZahlen(basis, antwort);
      if (!z) return "nicht berechenbar";
      if (z.reserve < 0) return "überbucht (" + txt(z.belegt) + " von " + txt(z.gesamt) + " Adressen)";
      return txt(z.reserve) + " Adressen frei (" + txt(z.belegt) + " von " + txt(z.gesamt) + " belegt)";
    }
    function planZeichnen(basis, antwort){
      const z = planZahlen(basis, antwort);
      const balken = E("div", "sw-plan-balken");
      if (z) {
        for (const zeile of z.zeilen) {
          const teil = E("div", "sw-plan-teil",
            E("span", "sw-plan-label", txt(zeile.karte.name) + " · /" + txt(zeile.karte.praefix)));
          teil.setAttribute("style", "flex:" + Math.max(1, zeile.laenge) + " 1 0");
          balken.append(teil);
        }
        if (z.reserve > 0) {
          const reserve = E("div", "sw-plan-reserve",
            E("span", "sw-plan-label", "Reserve " + txt(z.reserve)));
          reserve.setAttribute("style", "flex:" + z.reserve + " 1 0");
          balken.append(reserve);
        }
      }
      const legende = E("div", "sw-plan-legende",
        E("span", "sw-plan-legende-punkt", "belegt"),
        E("span", "sw-plan-legende-reserve", "Reserve"));
      plan.replaceChildren(balken, legende);
    }
    function planTabelleBauen(antwort){
      const tabelle = h("table", {class: "sw-tabelle"});
      const kopf = h("thead", {}, h("tr", {}, ["Abteilung", "Hosts", "Präfix", "Netz-ID", "Broadcast", "Hostbereich"]
        .map(x => h("th", {}, x))));
      const koerper = h("tbody", {}, antwort.zeilen.map(z => {
        const tr = h("tr", {"data-netz": txt(z.netz), "data-praefix": txt(z.praefix), "data-broadcast": txt(z.broadcast)}, [
          h("td", {}, txt(z.name)),
          h("td", {}, txt(z.hosts)),
          h("td", {}, "/" + txt(z.praefix)),
          h("td", {}, txt(z.netz)),
          h("td", {}, txt(z.broadcast)),
          h("td", {}, txt(z.ersterHost) + " – " + txt(z.letzterHost)),
        ]);
        return tr;
      }));
      tabelle.append(kopf, koerper);
      return tabelle;
    }
    bedarfZeichnen();
    erzeugenPlan();
  }

  /* ---------------- 6 · VLAN-Werkzeug ---------------- */
  function werkzeugVlan(buehne, opts){
    let ports = [
      {modus: "access", vlan: 1}, {modus: "access", vlan: 1}, {modus: "access", vlan: 2},
      {modus: "trunk", vlan: 1}, {modus: "access", vlan: 2}, {modus: "access", vlan: 3},
      {modus: "access", vlan: 3}, {modus: "trunk", vlan: 1},
    ];
    let gewaehlt = 0;
    const portFlaeche = E("div", "sw-ports");
    const panel = E("div", "sw-port-panel");
    const frames = E("div", "sw-frames");
    const matrix = E("div", "sw-matrix-rahmen");
    const ergebnis = ergebnisKasten();
    const vlanKlasse = n => "--vlan-" + ziffer(n, 1, 8, 1);
    buehne.append(
      E("div", "sw-switch", E("div", "sw-switch-kopf",
        E("span", "sw-switch-titel", "8-Port-Switch"),
        E("span", "sw-hinweis", "Port anklicken, dann Modus und VLAN wählen.")), portFlaeche, panel),
      E("p", "sw-hinweis", "Access-Ports gehören zu genau einem VLAN. Trunk-Ports tragen alle VLANs mit Tag. Die Farbe zeigt das VLAN, die Nummer steht immer dabei."),
      frames,
      E("p", "sw-feld-label", "Erreichbarkeitsmatrix: Von welchem Port erreicht ein Frame welchen anderen Port?"),
      matrix, ergebnis);
    function portText(p){
      return p.modus === "trunk" ? "Trunk · Native " + p.vlan : "Access · VLAN " + p.vlan;
    }
    function portZeichnen(){
      portFlaeche.replaceChildren(...ports.map((p, i) => {
        const b = K("", "sw-port", () => { gewaehlt = i; aktualisieren(); },
          {"aria-pressed": i === gewaehlt ? "true" : "false",
           "aria-label": "Port " + (i + 1) + ": " + portText(p),
           style: "--sw-vlan:var(" + vlanKlasse(p.vlan) + ")"});
        b.append(E("span", "sw-port-name", "P" + (i + 1)),
          E("span", "sw-port-modus", p.modus === "trunk" ? "Trunk" : "Access"),
          E("span", "sw-tag", p.modus === "trunk" ? "alle VLANs" : "VLAN " + p.vlan));
        return b;
      }));
    }
    function panelZeichnen(){
      const p = ports[gewaehlt];
      const access = K("Access", "sw-modus", () => { p.modus = "access"; aktualisieren(); },
        {"aria-pressed": p.modus === "access" ? "true" : "false", "aria-label": "Port " + (gewaehlt + 1) + " als Access setzen"});
      const trunk = K("Trunk", "sw-modus", () => { p.modus = "trunk"; p.vlan = 1; aktualisieren(); },
        {"aria-pressed": p.modus === "trunk" ? "true" : "false", "aria-label": "Port " + (gewaehlt + 1) + " als Trunk setzen"});
      const vlanKnoepfe = E("div", "sw-vlan-knoepfe", Array.from({length: 8}, (_, i) => {
        const n = i + 1;
        const b = K("VLAN " + n, "sw-vlan-knopf", () => { p.vlan = n; aktualisieren(); },
          {"aria-pressed": p.vlan === n ? "true" : "false", "aria-label": "VLAN " + n + " wählen",
           style: "--sw-vlan:var(" + vlanKlasse(n) + ")"});
        return b;
      }));
      const name = p.modus === "trunk" ? "Native VLAN (ungetaggt)" : "VLAN am Access-Port";
      panel.replaceChildren(
        E("div", "sw-port-panel-kopf", E("strong", {}, "Port " + (gewaehlt + 1)), E("span", "sw-hinweis", "Einstellung")),
        E("div", "sw-tasten", access, trunk),
        E("p", "sw-feld-label", name), vlanKnoepfe);
    }
    const FRAMES = [
      {von: 0, nach: 1, vlan: 1, text: "Frame A"},
      {von: 2, nach: 4, vlan: 2, text: "Frame B"},
      {von: 4, nach: 5, vlan: 3, text: "Frame C"},
      {von: 0, nach: 4, vlan: 1, text: "Frame D"},
    ];
    function traegt(p, vlan){ return p.modus === "trunk" ? true : p.vlan === vlan; }
    function erreichbar(a, b, vlan){
      if (a.modus === "access" && b.modus === "access") return a.vlan === b.vlan && a.vlan === vlan;
      return traegt(a, vlan) && traegt(b, vlan);
    }
    function frameZeilen(){
      return FRAMES.map(f => {
        const a = ports[f.von], b = ports[f.nach];
        const ok = erreichbar(a, b, f.vlan);
        const tag = E("span", "sw-tag", (a.modus === "trunk" ? "Tag " : "VLAN ") + f.vlan);
        tag.setAttribute("style", "--sw-vlan:var(" + vlanKlasse(f.vlan) + ")");
        return E("div", "sw-frame",
          E("span", "sw-frame-text", f.text + ": P" + (f.von + 1) + " → P" + (f.nach + 1)),
          tag,
          E("span", "sw-frame-status " + (ok ? "sw-ok" : "sw-bad"), ok ? "kommt an" : "kommt nicht an"));
      });
    }
    function matrixZeichnen(){
      const tabelle = h("table", {class: "sw-matrix"});
      const kopf = h("tr", {class: "sw-matrix-kopf"}, h("th", {}, "von / nach"),
        Array.from({length: 8}, (_, i) => h("th", {}, "P" + (i + 1))));
      const koerper = ports.map((a, i) => h("tr", {class: "sw-matrix-zeile"}, h("th", {}, "P" + (i + 1)),
        ports.map((b, j) => {
          const ja = i !== j && erreichbar(a, b, a.modus === "trunk" ? b.vlan : a.vlan);
          return h("td", {class: "sw-matrix-zelle " + (ja ? "sw-ja" : "sw-nein"), "aria-label": "P" + (i + 1) + " nach P" + (j + 1) + ": " + (ja ? "erreichbar" : "getrennt")}, ja ? "ja" : "–");
        })));
      tabelle.append(h("thead", {}, kopf), h("tbody", {}, koerper));
      matrix.replaceChildren(tabelle);
    }
    function vlanUebersicht(){
      const access = [...new Set(ports.filter(p => p.modus === "access").map(p => p.vlan))].sort((a, b) => a - b);
      const trunk = ports.filter(p => p.modus === "trunk").length;
      return [["Access-VLANs", access.length ? access.join(", ") : "keine"],
              ["Trunk-Ports", txt(trunk)],
              ["Access-Ports", txt(ports.length - trunk)]];
    }
    function aktualisieren(){
      portZeichnen();
      panelZeichnen();
      frames.replaceChildren(...frameZeilen());
      matrixZeichnen();
      ergebnis.replaceChildren(E("div", "sw-werte", vlanUebersicht().map(([l, v]) =>
        E("div", "sw-wert", E("span", "sw-wert-label", l), E("span", "sw-wert-zahl", v)))));
    }
    aktualisieren();
  }

  const WERKZEUG_BAU = {
    bitlabor: werkzeugBitlabor,
    maskenleiste: werkzeugMaskenleiste,
    blocklineal: werkzeugBlocklineal,
    rechner: werkzeugRechner,
    vlsm: werkzeugVlsm,
    vlan: werkzeugVlan,
  };

  /* ---------------- öffentliche Werkzeug-Schnittstelle ---------------- */
  function liste(){
    return WERKZEUGE.map(w => ({id: w.id, titel: w.titel, kicker: w.kicker, lead: w.lead,
      skill: w.skill, stufe: w.stufe}));
  }
  function zeichnen(container, id, opts = {}){
    opts = opts || {};
    /* W3 verpackt Lektions-/Formelsammlungs-Presets als {preset:{ip,praefix}}; beides akzeptieren
       (Didaktik S10): flache Optionen gewinnen, fehlende Werte fallen auf das Preset zurück. */
    if (opts.preset && typeof opts.preset === "object") opts = Object.assign({}, opts.preset, opts);
    if (!container || typeof container.replaceChildren !== "function") return {zerstoeren(){}};
    const meta = WERKZEUGE.find(w => w.id === id) || null;
    if (!meta) {
      const leer = E("div", "sw sw-leer",
        E("p", "sw-hinweis", "Dieses Werkzeug gibt es nicht. Verfügbar: " + WERKZEUGE.map(w => w.id).join(", ") + "."));
      container.replaceChildren(leer);
      return {zerstoeren(){ try { leer.remove(); } catch (e) { /* ohne DOM nichts zu tun */ } }};
    }
    /* Eingebettet: in der Abteilung liefert W3 den Kopf UND die Aktionen; in der Lektion ist
       kompakt gesetzt. Dann KEIN zweiter Kopf und KEIN Fuß (S1). Eigenständige Aufrufer bekommen
       den vollen Kopf. */
    const eingebettet = !!opts.kompakt || typeof opts.onErgebnis === "function";
    const klassen = ["sw"];
    if (eingebettet) klassen.push("sw-eingebettet");
    if (opts.kompakt) klassen.push("sw-kompakt");
    const root = E("section", klassen.join(" "));
    root.setAttribute("data-werkzeug", meta.id);
    if (opts.niveau) root.setAttribute("data-niveau", txt(opts.niveau));
    if (opts.kompakt) root.append(werkzeugMikroKopf(meta));
    else if (!eingebettet) root.append(werkzeugKopf(meta));
    const buehne = E("div", "sw-buehne");
    root.append(buehne);
    if (!eingebettet) {
      const fuss = werkzeugFuss(meta, opts);
      if (fuss) root.append(fuss);
    }
    container.replaceChildren(root);
    baueWerkzeug(buehne, meta, opts);
    return {zerstoeren(){ try { root.remove(); } catch (e) { /* ohne DOM nichts zu tun */ } }};
  }

  /* ======================================================================
     LERNSPIELE (§ 8): deterministischer Seed, Ergebnis über Spiel.subnetz.antwort,
     Bestwert nur über Spiel.subnetz.fortschritt (kein direkter store-Zugriff).
     ====================================================================== */

  /* Gesäter Generator (mulberry32) – Zufall ausschließlich mit Seed, nie über die Uhr. */
  function saat(seed){
    let a = (Number(seed) >>> 0) || 1;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mischen(liste, zufall){
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(zufall() * (i + 1));
      const h = a[i]; a[i] = a[j]; a[j] = h;
    }
    return a;
  }
  function spielSeed(opts, standard){
    return typeof opts.seed === "number" && Number.isFinite(opts.seed) ? Math.abs(Math.floor(opts.seed)) : standard;
  }
  function bestwert(id){
    const f = ruf("fortschritt");
    const s = f && f.spiele && f.spiele[id];
    const b = s ? s.bestwert : null;
    return typeof b === "number" && Number.isFinite(b) ? b : null;
  }
  function bestwertText(id){
    const b = bestwert(id);
    return b == null ? "–" : txt(b);
  }
  function spielAufgabe({id, art, niveau, titel, frage, lage, soll, optionen, rechenweg}){
    return {
      id, art, niveau, skill: "lab.subnetz", titel, frage, lage,
      eingabe: {art: "auswahl", optionen: (optionen || []).map(t => ({text: t}))},
      loesung: {wert: soll, text: soll},
      rechenweg: rechenweg || [],
      erklaerung: "", hinweis: "", visual: null, quelle: "RFC 4632 · Lernfassung",
    };
  }
  /* Verbucht eine beendete Runde: je Aufgabe ein Lerneintrag, beim LETZTEN Eintrag zusätzlich
     {spiel:{id, punkte}} – so zählt W1 die Runde genau einmal und der Bestwert bleibt gepflegt. */
  function rundeVerbuchen(protokoll, spielId, punkte){
    for (let i = 0; i < protokoll.length; i++) {
      const e = protokoll[i];
      const opts = {hilfe: false};
      if (i === protokoll.length - 1) opts.spiel = {id: spielId, punkte};
      ruf("antwort", e.aufgabe, !!e.richtig, opts);
    }
  }
  function spielAbschluss(ergebnis, meta, opts, ziel, karte){
    ziel.replaceChildren(karte);
    if (typeof opts.onEnde === "function") {
      try { opts.onEnde(ergebnis); } catch (e) { console.error("onEnde", e); }
    }
    if (typeof opts.onErgebnis === "function") {
      try {
        opts.onErgebnis({art: "spiel", id: meta.id, skill: meta.skill,
          geloest: ergebnis.richtig > ergebnis.falsch, hilfe: false});
      } catch (e) { console.error("onErgebnis", e); }
    }
  }
  function ergebnisKarte(titel, paare, auswertung){
    const karte = h("div", {class: "sg-ergebnis", "aria-live": "polite"},
      E("h4", "sg-ergebnis-titel", titel),
      E("div", "sg-werte", paare.map(([l, v]) =>
        E("div", "sg-wert", E("span", "sg-wert-label", l), E("span", "sg-wert-zahl", txt(v))))));
    if (auswertung) karte.append(auswertung);
    return karte;
  }

  /* ---------------- Spiel 1 · Präfix-Blitz ---------------- */
  function spielPraefixBlitz(buehne, opts, meta){
    if (!hat("praefixZuMaske") || !hat("maskeZuPraefix") || !hat("rechnen")) {
      buehne.append(E("p", "sg-hinweis", "Für den Präfix-Blitz fehlen noch Teile des Rechenkerns (Spiel.subnetz)."));
      return {zerstoeren(){}};
    }
    const niveau = opts.niveau === "AP2" ? "AP2" : "AP1";
    const seed = spielSeed(opts, 4711);
    const zufall = saat(seed);
    const PRAEFIXE = niveau === "AP2"
      ? [16, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
      : [20, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    const MODI = ["praefix-zu-maske", "maske-zu-praefix", "praefix-zu-hosts"];
    const fragen = [];
    for (let i = 0; i < 30; i++) {
      const mode = MODI[i % MODI.length];
      const p = PRAEFIXE[Math.floor(zufall() * PRAEFIXE.length)];
      const maske = ruf("praefixZuMaske", p);
      const r = ruf("rechnen", "192.168.0.0", p);
      if (!maske || !r) continue;
      let frage, lage, soll, baue, rechenweg;
      if (mode === "praefix-zu-maske") {
        frage = "Welche Maske gehört zu Präfix /" + p + "?";
        lage = [{label: "Präfix", wert: "/" + p}];
        soll = maske;
        baue = off => ruf("praefixZuMaske", Math.max(0, Math.min(32, p + off)));
        rechenweg = [
          {n: 1, titel: "Präfix lesen", text: "/" + p + " heißt " + p + " Einsen von links in der Netzmaske.", ergebnis: String(p)},
          {n: 2, titel: "Maske schreiben", text: "Die Dotted-Notation dieser Netzmaske lautet " + maske + ".", ergebnis: maske},
        ];
      } else if (mode === "maske-zu-praefix") {
        frage = "Welcher Präfix gehört zur Maske " + maske + "?";
        lage = [{label: "Maske", wert: maske}];
        soll = "/" + p;
        baue = off => "/" + Math.max(0, Math.min(32, p + off));
        rechenweg = [
          {n: 1, titel: "Maske in Binär", text: "Die Maske " + maske + " hat von links gezählt " + p + " Einsen.", ergebnis: "/" + p},
          {n: 2, titel: "Einsen zählen", text: "So viele Einsen, so groß ist der Präfix: /" + p + ".", ergebnis: String(p)},
        ];
      } else {
        frage = "Wie viele nutzbare Hosts hat Präfix /" + p + "?";
        lage = [{label: "Präfix", wert: "/" + p}];
        soll = txt(r.hosts);
        baue = off => {
          const rr = ruf("rechnen", "192.168.0.0", Math.max(0, Math.min(32, p + off)));
          return rr ? txt(rr.hosts) : null;
        };
        rechenweg = [
          {n: 1, titel: "Hostbits zählen", text: "32 Bit minus Präfix /" + p + " ergibt " + r.hostBits + " Hostbits.", ergebnis: txt(r.hostBits)},
          {n: 2, titel: "Hosts rechnen", text: "2 hoch " + r.hostBits + " minus 2 ergibt " + r.hosts + " nutzbare Hosts.", ergebnis: txt(r.hosts)},
        ];
      }
      const gesehen = new Set([soll]), werte = [soll];
      for (const off of [1, -1, 2, -2, 3, -3, 4, -4]) {
        if (werte.length >= 4) break;
        const w = baue(off);
        if (w && !gesehen.has(w)) { gesehen.add(w); werte.push(w); }
      }
      if (werte.length < 4) continue;
      const optionen = mischen(werte, zufall);
      const aufgabe = spielAufgabe({
        id: "praefix-blitz-" + seed + "-" + i, art: mode === "praefix-zu-hosts" ? "hosts" : "maske",
        niveau, titel: "Präfix-Blitz", frage, lage, soll, optionen, rechenweg,
      });
      fragen.push({frage, lage, soll, optionen, aufgabe, rechenweg});
    }
    if (fragen.length < 3) {
      buehne.append(E("p", "sg-hinweis", "Der Präfix-Blitz konnte keine Aufgaben bauen. Bitte später erneut versuchen."));
      return {zerstoeren(){}};
    }
    let rest = 60, index = 0, richtig = 0, falsch = 0, serie = 0, serieBest = 0;
    let gesperrt = false, beendet = false, timer = null, weiterTimer = null;
    const protokoll = [];
    const zeit = E("span", "sg-zeit", "60 s");
    const stand = E("span", "sg-punkte", "Richtig 0 · Serie 0");
    const best = E("span", "sg-bestwert", "Bestwert " + bestwertText(meta.id));
    const status = E("div", "sg-status", zeit, stand, best);
    const frageFeld = E("div", "sg-fragebereich");
    buehne.append(status, frageFeld,
      E("p", "sg-hinweis", "Antworte mit einem Klick auf die passende Karte. Richtig gibt Pluspunkte, ein Fehler setzt die Serie auf null."));
    function frageZeichnen(){
      const f = fragen[index];
      const optionen = E("div", "sg-optionen", f.optionen.map(text => {
        const b = K(text, "sg-option", () => antworten(text), {"aria-label": "Antwort " + text});
        return b;
      }));
      const rueck = h("p", {class: "sg-rueckmeldung", "aria-live": "polite"});
      const rechenweg = E("div", "sg-rechenweg-liste", "");
      frageFeld.replaceChildren(
        E("p", "sg-fortschritt", "Karte " + (index + 1) + " von " + fragen.length),
        E("h4", "sg-frage", f.frage),
        E("div", "sg-lage", f.lage.map(z => E("div", "sg-lage-zeile",
          E("span", "sg-lage-label", z.label), E("span", "sg-lage-wert", z.wert)))),
        optionen, rueck, rechenweg);
      frageFeld._antworten = {optionen, rueck, rechenweg};
    }
    function antworten(text){
      if (gesperrt || beendet) return;
      gesperrt = true;
      const f = fragen[index];
      const ok = text === f.soll;
      if (ok) { richtig += 1; serie += 1; serieBest = Math.max(serieBest, serie); }
      else { falsch += 1; serie = 0; }
      protokoll.push({frage: f.frage, richtig: ok, soll: f.soll, aufgabe: f.aufgabe, rechenweg: f.rechenweg});
      const felder = frageFeld._antworten;
      if (felder) {
        for (const b of felder.optionen.querySelectorAll(".sg-option")) {
          b.disabled = true;
          const t = txt(b.textContent);
          b.className = "knopf sg-option" + (t === f.soll ? " sg-option-richtig" : t === text ? " sg-option-falsch" : "");
        }
        felder.rueck.className = "sg-rueckmeldung " + (ok ? "sg-ok" : "sg-bad");
        felder.rueck.textContent = ok
          ? "Richtig: " + f.soll + "."
          : "Nicht richtig. Richtig ist " + f.soll + ".";
        felder.rechenweg.replaceChildren(...f.rechenweg.map(s =>
          E("p", "sg-rechenweg", "Schritt " + s.n + ": " + s.titel + " – " + s.text + " → " + s.ergebnis)));
      }
      stand.textContent = "Richtig " + richtig + " · Falsch " + falsch + " · Serie " + serie;
      if (index + 1 >= fragen.length) { beenden(); return; }
      /* „Weiter“ ist immer da. Bei richtiger Antwort geht es zusätzlich nach 1,8 s automatisch
         weiter; bei falscher Antwort bleibt Rückmeldung samt Rechenweg stehen, bis „Weiter“
         gedrückt wird (S11). */
      const weiter = K("Weiter", "sg-weiter", naechsteKarte, {"aria-label": "Nächste Karte"});
      frageFeld.append(weiter);
      if (ok) weiterTimer = setTimeout(naechsteKarte, 1800);
    }
    function naechsteKarte(){
      if (beendet) return;
      if (weiterTimer) { clearTimeout(weiterTimer); weiterTimer = null; }
      if (index + 1 >= fragen.length) { beenden(); return; }
      index += 1;
      gesperrt = false;
      frageZeichnen();
    }
    function tick(){
      if (beendet) return;
      rest -= 1;
      zeit.textContent = Math.max(0, rest) + " s";
      if (rest <= 0) { beenden(); return; }
      timer = setTimeout(tick, 1000);
    }
    function beenden(){
      if (beendet) return;
      beendet = true;
      if (timer) { clearTimeout(timer); timer = null; }
      if (weiterTimer) { clearTimeout(weiterTimer); weiterTimer = null; }
      const punkte = richtig * 10 + serieBest * 2;
      rundeVerbuchen(protokoll, meta.id, punkte);
      const ergebnis = {
        id: meta.id, punkte, richtig, falsch, serie: serieBest,
        dauerSek: Math.max(0, 60 - rest),
        aufgaben: protokoll.map(e => ({frage: e.frage, richtig: e.richtig, soll: e.soll})),
      };
      const auswertung = E("div", "sg-auswertung", E("p", "sg-auswertung-titel", "Fehlerauswertung"));
      const falsche = protokoll.filter(e => !e.richtig);
      if (!falsche.length && protokoll.length) {
        auswertung.append(E("p", "sg-hinweis", "Keine Fehler in dieser Runde – die Serie hielt bis zum Schluss."));
      } else if (!protokoll.length) {
        auswertung.append(E("p", "sg-hinweis", "Keine Karte beantwortet – starte die Runde noch einmal."));
      } else {
        for (const e of falsche) {
          auswertung.append(E("div", "sg-auswertung-zeile",
            E("p", "sg-auswertung-frage", e.frage),
            E("p", "sg-auswertung-soll", "Richtig: " + e.soll),
            E("p", "sg-auswertung-weg", e.rechenweg.map(s => s.text).join(" "))));
        }
      }
      const karte = ergebnisKarte("Ergebnis: Präfix-Blitz", [
        ["Richtig", richtig], ["Falsch", falsch], ["Punkte", punkte],
        ["Beste Serie", serieBest], ["Dauer", ergebnis.dauerSek + " s"],
        ["Bestwert", bestwertText(meta.id)],
      ], auswertung);
      spielAbschluss(ergebnis, meta, opts, frageFeld, karte);
    }
    frageZeichnen();
    timer = setTimeout(tick, 1000);
    return {zerstoeren(){
      beendet = true;
      if (timer) { clearTimeout(timer); timer = null; }
      if (weiterTimer) { clearTimeout(weiterTimer); weiterTimer = null; }
    }};
  }

  /* ---------------- Spiel 2 · Netz-Sortierer ---------------- */
  const SORTIER_SZENARIEN = [
    {titel: "Büroetage", basis: "192.168.10.0", praefix: 26,
     adressen: ["192.168.10.12", "192.168.10.51", "192.168.10.66", "192.168.10.90",
                "192.168.10.125", "192.168.10.140", "192.168.10.171", "192.168.10.180"]},
    {titel: "Werkstatt", basis: "10.0.0.0", praefix: 27,
     adressen: ["10.0.0.5", "10.0.0.20", "10.0.0.28", "10.0.0.37",
                "10.0.0.50", "10.0.0.66", "10.0.0.78", "10.0.0.94"]},
    {titel: "Filiale", basis: "172.16.0.0", praefix: 28,
     adressen: ["172.16.0.2", "172.16.0.6", "172.16.0.10", "172.16.0.18",
                "172.16.0.26", "172.16.0.34", "172.16.0.42", "172.16.0.46"]},
  ];
  function spielNetzSortierer(buehne, opts, meta){
    if (!hat("rechnen")) {
      buehne.append(E("p", "sg-hinweis", "Für den Netz-Sortierer fehlt noch der Rechenkern (Spiel.subnetz)."));
      return {zerstoeren(){}};
    }
    const seed = spielSeed(opts, 7311);
    const sz = SORTIER_SZENARIEN[seed % SORTIER_SZENARIEN.length];
    const netze = [];
    const runden = sz.adressen.map(ip => {
      const r = ruf("rechnen", ip, sz.praefix);
      if (!r) return null;
      if (!netze.some(n => n.netz === r.netz)) netze.push({netz: r.netz, praefix: r.praefix, block: r.blockGroesse});
      return r;
    });
    if (runden.some(r => !r) || netze.length !== 3) {
      buehne.append(E("p", "sg-hinweis", "Die Sortier-Aufgabe konnte nicht vollständig gebaut werden."));
      return {zerstoeren(){}};
    }
    netze.sort((a, b) => ipZahl(a.netz) - ipZahl(b.netz));
    const startZeit = Date.now();
    let zuordnung = new Array(sz.adressen.length).fill(null);
    let ausgewaehlt = null, geprueft = false;
    const regel = E("p", "sg-regel", "Basis: " + sz.basis + "/" + sz.praefix + " · jedes Netz umfasst " + netze[0].block + " Adressen.");
    const spalten = E("div", "sg-netz-spalten");
    const vorrat = E("div", "sg-adressen");
    const rueck = E("p", "sg-rueckmeldung", "Wähle eine Adresse und klicke dann auf das passende Netz.");
    rueck.setAttribute("aria-live", "polite");
    const pruefen = K("Prüfen", "sg-pruefen", sortierenPruefen);
    const feld = E("div", "sg-fragebereich");
    buehne.append(regel,
      E("p", "sg-feld-label", "1. Adresse wählen"), vorrat,
      E("p", "sg-feld-label", "2. Zielnetz wählen"), spalten,
      E("div", "sg-fuss", pruefen), rueck, feld);
    function chip(j, zugeordnet){
      const b = K("", "sg-adresse", () => {
        if (geprueft) return;
        if (zugeordnet) { zuordnung[j] = null; ausgewaehlt = j; }
        else ausgewaehlt = ausgewaehlt === j ? null : j;
        zeichnen();
        fokusSetzen(spalten.querySelector(".sg-netz-wahl"));
      }, {"aria-pressed": ausgewaehlt === j ? "true" : "false",
          "aria-label": "Adresse " + sz.adressen[j] + (zugeordnet ? " zurück in den Vorrat" : " auswählen")});
      b.append(E("span", "sg-adresse-name", sz.adressen[j]));
      if (zugeordnet) b.append(E("span", "sg-adresse-hinweis", "zurückholen"));
      b.className = "knopf sg-adresse" + (ausgewaehlt === j ? " sg-adresse-gewaehlt" : "") +
        (geprueft && zugeordnet ? " sg-adresse-zugeordnet" : "");
      return b;
    }
    function fokusSetzen(el){ try { if (el && typeof el.focus === "function") el.focus(); } catch (e) { /* ohne DOM nichts zu tun */ } }
    function zuordnen(i){
      if (geprueft || ausgewaehlt == null) return;
      zuordnung[ausgewaehlt] = i;
      ausgewaehlt = null;
      zeichnen();
      fokusSetzen(vorrat.querySelector(".sg-adresse"));
      rueck.textContent = "Zugeordnet – wähle die nächste Adresse mit Enter.";
    }
    function zeichnen(){
      spalten.replaceChildren(...netze.map((n, i) => {
        const zone = E("div", "sg-netz-zone");
        zuordnung.forEach((z, j) => { if (z === i) zone.append(chip(j, true)); });
        /* Tastaturweg (B3): Das Ziel ist ein echter Knopf; Enter/Leertaste lösen ihn aus. */
        const wahl = K("In " + n.netz + "/" + n.praefix + " ablegen", "sg-netz-wahl", () => zuordnen(i),
          {"aria-label": "Gewählte Adresse in Netz " + n.netz + " ablegen"});
        wahl.disabled = geprueft || ausgewaehlt == null;
        const sp = E("div", "sg-netz",
          E("p", "sg-netz-name", n.netz + "/" + n.praefix),
          E("p", "sg-netz-hinweis", "Block " + n.block + " Adressen"),
          zone, wahl);
        sp.addEventListener("click", () => zuordnen(i));
        return sp;
      }));
      vorrat.replaceChildren(...sz.adressen.map((ip, j) => zuordnung[j] == null ? chip(j, false) : null).filter(Boolean));
      rueck.className = "sg-rueckmeldung";
      if (!geprueft) rueck.textContent = ausgewaehlt == null
        ? "1. Adresse mit Enter wählen · 2. mit Enter auf „In Netz … ablegen“ zuordnen."
        : "Adresse " + sz.adressen[ausgewaehlt] + " ist gewählt – jetzt ein Zielnetz mit Enter wählen.";
    }
    function sortierenPruefen(){
      if (geprueft) return;
      if (zuordnung.some(z => z == null)) {
        rueck.className = "sg-rueckmeldung sg-bad";
        rueck.textContent = "Noch nicht alle acht Adressen sind zugeordnet.";
        return;
      }
      geprueft = true;
      let rich = 0, fal = 0;
      const protokoll = [];
      const auswertung = E("div", "sg-auswertung", E("p", "sg-auswertung-titel", "Auflösung mit Rechenweg"));
      sz.adressen.forEach((ip, j) => {
        const r = runden[j];
        const gewaehlt = netze[zuordnung[j]].netz;
        const ok = gewaehlt === r.netz;
        if (ok) rich += 1; else fal += 1;
        const aufgabe = spielAufgabe({
          id: "netz-sortierer-" + seed + "-" + j, art: "netzid", niveau: "E", titel: "Netz-Sortierer",
          frage: "In welchem Netz liegt " + ip + "/" + sz.praefix + "?",
          lage: [{label: "Adresse", wert: ip + "/" + sz.praefix}], soll: r.netz,
          optionen: netze.map(n => n.netz), rechenweg: r.schritte,
        });
        protokoll.push({aufgabe, richtig: ok});
        auswertung.append(E("div", "sg-auswertung-zeile",
          E("p", "sg-auswertung-frage", ip + "/" + sz.praefix + " → " + (ok ? "richtig" : "falsch")),
          E("p", "sg-auswertung-soll", "Netz-ID: " + r.netz),
          E("p", "sg-auswertung-weg", "Blockgröße " + r.blockGroesse + " Adressen. " + (r.schritte[3] ? r.schritte[3].text : ""))));
      });
      const punkte = rich * 10;
      rundeVerbuchen(protokoll, meta.id, punkte);
      const ergebnis = {
        id: meta.id, punkte, richtig: rich, falsch: fal, serie: 0,
        dauerSek: Math.max(0, Math.round((Date.now() - startZeit) / 1000)),
        aufgaben: protokoll.map(e => ({frage: e.aufgabe.frage, richtig: e.richtig, soll: e.aufgabe.loesung.wert})),
      };
      const karte = ergebnisKarte("Ergebnis: Netz-Sortierer", [
        ["Richtig", rich], ["Falsch", fal], ["Punkte", punkte],
        ["Dauer", ergebnis.dauerSek + " s"], ["Bestwert", bestwertText(meta.id)],
      ], auswertung);
      spielAbschluss(ergebnis, meta, opts, feld, karte);
      zeichnen();
    }
    zeichnen();
    return {zerstoeren(){ geprueft = true; }};
  }

  /* ---------------- Spiel 3 · VLAN-Patcher ---------------- */
  const PATCHER_SZENARIEN = [
    {titel: "Schulnetz", text: "Zwei Räume sollen je ein eigenes Broadcast-Netz bekommen; zwei uplink-Ports tragen alle VLANs.",
     anforderung: [{modus: "access", vlan: 2}, {modus: "access", vlan: 2}, {modus: "access", vlan: 4},
                   {modus: "trunk", vlan: 1}, {modus: "access", vlan: 4}, {modus: "access", vlan: 6},
                   {modus: "access", vlan: 6}, {modus: "trunk", vlan: 1}]},
    {titel: "Werkstatt", text: "Drei Teams arbeiten getrennt; der Router hängt an einem Trunk-Port, ein weiterer Trunk führt zum Lager.",
     anforderung: [{modus: "access", vlan: 3}, {modus: "access", vlan: 3}, {modus: "access", vlan: 5},
                   {modus: "access", vlan: 5}, {modus: "access", vlan: 7}, {modus: "trunk", vlan: 1},
                   {modus: "access", vlan: 7}, {modus: "trunk", vlan: 1}]},
    {titel: "Praxis", text: "Empfang und Labor sind getrennt; zwei Trunks verbinden die Etagen, ein Port bleibt für Gäste.",
     anforderung: [{modus: "access", vlan: 2}, {modus: "access", vlan: 2}, {modus: "trunk", vlan: 1},
                   {modus: "access", vlan: 5}, {modus: "access", vlan: 8}, {modus: "trunk", vlan: 1},
                   {modus: "access", vlan: 8}, {modus: "access", vlan: 5}]},
  ];
  function spielVlanPatcher(buehne, opts, meta){
    const seed = spielSeed(opts, 9137);
    const sz = PATCHER_SZENARIEN[seed % PATCHER_SZENARIEN.length];
    const startZeit = Date.now();
    let ports = Array.from({length: 8}, () => ({modus: "access", vlan: 1}));
    let gewaehlt = 0, abgegeben = false;
    const vlanKlasse = n => "--vlan-" + ziffer(n, 1, 8, 1);
    const auftrag = E("div", "sg-auftrag",
      E("p", "sg-auftrag-titel", sz.titel),
      E("p", "sg-auftrag-text", sz.text));
    const anforderung = E("div", "sg-anforderung", sz.anforderung.map((a, i) => {
      return E("p", "sg-anforderung-zeile", "Port " + (i + 1) + ": " +
        (a.modus === "trunk" ? "Trunk (alle VLANs mit Tag)" : "Access in VLAN " + a.vlan));
    }));
    const portFlaeche = E("div", "sg-ports");
    const panel = E("div", "sg-port-panel");
    const diff = E("div", "sg-diff", "");
    const rueck = E("p", "sg-rueckmeldung", "Stelle die Ports nach der Anforderung ein und prüfe dann.");
    rueck.setAttribute("aria-live", "polite");
    const pruefen = K("Prüfen", "sg-pruefen", () => patcherPruefen(false));
    const abgeben = K("Abgeben", "sg-abgeben", () => patcherPruefen(true));
    const feld = E("div", "sg-fragebereich");
    buehne.append(auftrag, anforderung, E("p", "sg-feld-label", "Switch-Ports"), portFlaeche, panel,
      E("div", "sg-fuss", pruefen, abgeben), rueck, diff, feld);
    function portText(p){
      return p.modus === "trunk" ? "Trunk · alle VLANs" : "Access · VLAN " + p.vlan;
    }
    function stimmt(i){
      const a = sz.anforderung[i], p = ports[i];
      return a.modus === p.modus && (a.modus === "trunk" || a.vlan === p.vlan);
    }
    function portZeichnen(){
      portFlaeche.replaceChildren(...ports.map((p, i) => {
        const b = K("", "sg-port", () => { gewaehlt = i; zeichnen(); },
          {"aria-pressed": i === gewaehlt ? "true" : "false",
           "aria-label": "Port " + (i + 1) + ": " + portText(p),
           style: "--sw-vlan:var(" + vlanKlasse(p.vlan) + ")"});
        b.append(E("span", "sg-port-name", "P" + (i + 1)),
          E("span", "sg-port-modus", p.modus === "trunk" ? "Trunk" : "Access"),
          E("span", "sg-tag", p.modus === "trunk" ? "alle VLANs" : "VLAN " + p.vlan));
        return b;
      }));
    }
    function panelZeichnen(){
      const p = ports[gewaehlt];
      const access = K("Access", "sg-modus", () => { p.modus = "access"; zeichnen(); },
        {"aria-pressed": p.modus === "access" ? "true" : "false", "aria-label": "Port " + (gewaehlt + 1) + " als Access setzen"});
      const trunk = K("Trunk", "sg-modus", () => { p.modus = "trunk"; p.vlan = 1; zeichnen(); },
        {"aria-pressed": p.modus === "trunk" ? "true" : "false", "aria-label": "Port " + (gewaehlt + 1) + " als Trunk setzen"});
      const vlanKnoepfe = E("div", "sg-vlan-knoepfe", Array.from({length: 8}, (_, i) => {
        const n = i + 1;
        return K("VLAN " + n, "sg-vlan-knopf", () => { p.vlan = n; zeichnen(); },
          {"aria-pressed": p.vlan === n ? "true" : "false", "aria-label": "VLAN " + n + " wählen",
           style: "--sw-vlan:var(" + vlanKlasse(n) + ")"});
      }));
      panel.replaceChildren(
        E("div", "sg-port-panel-kopf", E("strong", {}, "Port " + (gewaehlt + 1)),
          E("span", "sg-hinweis", p.modus === "trunk" ? "Trunk trägt alle VLANs" : "Access gehört zu einem VLAN")),
        E("div", "sg-tasten", access, trunk), vlanKnoepfe);
    }
    function zeichnen(){
      portZeichnen();
      panelZeichnen();
    }
    function patcherPruefen(abschluss){
      if (abgegeben) return;
      const abweichungen = [];
      for (let i = 0; i < 8; i++) if (!stimmt(i)) {
        abweichungen.push({i, soll: sz.anforderung[i], ist: ports[i]});
      }
      if (abschluss) {
        abgegeben = true;
        let rich = 0, fal = 0;
        const protokoll = [];
        for (let i = 0; i < 8; i++) {
          const ok = stimmt(i);
          if (ok) rich += 1; else fal += 1;
          const a = sz.anforderung[i];
          const sollText = a.modus === "trunk" ? "Trunk" : "Access in VLAN " + a.vlan;
          const aufgabe = spielAufgabe({
            id: "vlan-patcher-" + seed + "-" + i, art: "vlan-port", niveau: "E", titel: "VLAN-Patcher",
            frage: "Wie muss Port " + (i + 1) + " konfiguriert sein?",
            lage: [{label: "Anforderung", wert: sollText}], soll: sollText,
            optionen: [sollText], rechenweg: [{n: 1, titel: "Anforderung lesen", text: "Port " + (i + 1) + " soll " + sollText + " sein.", ergebnis: sollText}],
          });
          protokoll.push({aufgabe, richtig: ok});
        }
        const punkte = rich * 10;
        rundeVerbuchen(protokoll, meta.id, punkte);
        const ergebnis = {
          id: meta.id, punkte, richtig: rich, falsch: fal, serie: 0,
          dauerSek: Math.max(0, Math.round((Date.now() - startZeit) / 1000)),
          aufgaben: protokoll.map(e => ({frage: e.aufgabe.frage, richtig: e.richtig, soll: e.aufgabe.loesung.wert})),
        };
        const auswertung = E("div", "sg-auswertung", E("p", "sg-auswertung-titel", "Abweichungen je Port"));
        for (let i = 0; i < 8; i++) {
          const a = sz.anforderung[i];
          const sollText = a.modus === "trunk" ? "Trunk" : "Access in VLAN " + a.vlan;
          auswertung.append(E("div", "sg-auswertung-zeile",
            E("p", "sg-auswertung-frage", "Port " + (i + 1) + ": " + (stimmt(i) ? "richtig" : "falsch")),
            E("p", "sg-auswertung-soll", "Soll: " + sollText),
            stimmt(i) ? null : E("p", "sg-auswertung-weg", "Ist: " + portText(ports[i]))));
        }
        const karte = ergebnisKarte("Ergebnis: VLAN-Patcher", [
          ["Richtige Ports", rich], ["Falsche Ports", fal], ["Punkte", punkte],
          ["Dauer", ergebnis.dauerSek + " s"], ["Bestwert", bestwertText(meta.id)],
        ], auswertung);
        spielAbschluss(ergebnis, meta, opts, feld, karte);
        return;
      }
      diff.replaceChildren();
      if (!abweichungen.length) {
        rueck.className = "sg-rueckmeldung sg-ok";
        rueck.textContent = "Keine Abweichung – alle acht Ports stimmen mit der Anforderung überein.";
      } else {
        rueck.className = "sg-rueckmeldung sg-bad";
        rueck.textContent = abweichungen.length + " Port(s) weichen noch ab.";
        for (const a of abweichungen) {
          const sollText = a.soll.modus === "trunk" ? "Trunk" : "Access in VLAN " + a.soll.vlan;
          diff.append(E("p", "sg-diff-zeile", "Port " + (a.i + 1) + ": soll " + sollText + " – jetzt " + portText(a.ist)));
        }
      }
    }
    zeichnen();
    return {zerstoeren(){ abgegeben = true; }};
  }

  const SPIEL_BAU = {
    "praefix-blitz": spielPraefixBlitz,
    "netz-sortierer": spielNetzSortierer,
    "vlan-patcher": spielVlanPatcher,
  };
  function spieleListe(){
    return SPIELE.map(s => ({id: s.id, titel: s.titel, kicker: s.kicker, lead: s.lead,
      skill: s.skill, stufe: s.stufe, dauerText: s.dauerText}));
  }
  function spielStarten(container, id, opts = {}){
    opts = opts || {};
    if (!container || typeof container.replaceChildren !== "function") return {zerstoeren(){}};
    const meta = SPIELE.find(s => s.id === id) || null;
    const root = E("section", "sg" + (opts.kompakt ? " sg-kompakt" : ""));
    root.setAttribute("data-spiel", id == null ? "" : txt(id));
    const buehne = E("div", "sg-buehne");
    let innen = {zerstoeren(){}};
    let tot = false;
    function zerstoeren(){
      if (tot) return;
      tot = true;
      try { innen.zerstoeren(); } catch (e) { console.error("Spiel", e); }
      try { root.remove(); } catch (e) { /* ohne DOM nichts zu tun */ }
    }
    const kopf = E("div", "sg-kopf",
      E("p", "sg-kicker", "Lernspiel" + (meta ? " · " + meta.kicker : "")),
      E("h3", "sg-titel", meta ? meta.titel : "Lernspiel"),
      E("p", "sg-lead", meta ? meta.lead : "Dieses Lernspiel gibt es nicht."),
      E("div", "sg-fuss", K("Spiel beenden", "sg-beenden", zerstoeren)));
    root.append(kopf, buehne);
    if (!meta) {
      buehne.append(E("p", "sg-hinweis", "Dieses Lernspiel gibt es nicht. Verfügbar: " + SPIELE.map(s => s.id).join(", ") + "."));
    } else if (!hat("rechnen")) {
      buehne.append(E("p", "sg-hinweis", "Der Rechenkern Spiel.subnetz ist noch nicht geladen. Sobald er bereitsteht, starten die Lernspiele."));
    } else {
      const bau = SPIEL_BAU[meta.id];
      innen = typeof bau === "function" ? bau(buehne, opts, meta) : {zerstoeren(){}};
    }
    container.replaceChildren(root);
    return {zerstoeren};
  }
  const spiele = {liste: spieleListe, starten: spielStarten};

  return {liste, zeichnen, spiele};
})();
