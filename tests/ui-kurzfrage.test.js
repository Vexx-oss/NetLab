"use strict";
/* UI: LEISTEN-KURZÜBUNG MIT KONTEXTFRAGE UND LAGE-BLOCK (Runde 6, W2)

   BEFUND (Nutzer, 31.10.2026, Nachweise/runde6/befund-kurzuebung-kontextlos.png): Die aufgeklappte
   Minileiste zeigte eine generische Mini-Frage („Antwortet 10.0.0.1 auf einen Ping aus dem LAN?")
   mit Kontextzeile, aber ohne das Netz des Auftrags – „wie soll der Schüler das hier lösen?".
   Die Kurzübung muss deshalb die von Spiel.kurzfrage erzeugte Frage ZUM AUFRAG samt Lage-Block
   zeigen; ohne verwertbare Frage gibt es keinen Quiz, sondern einen ehrlichen Hinweis und den Weg
   ins Labor.

   Geprüft wird die Datei, die im Programm läuft (src/ui/leiste.js) in einem eigenen Bereich mit
   nachgebildetem DOM und einem Stub-Spiel. Der Stub liefert genau die Felder aus dem Vertrag
   (Entwurf – Runde 6 § 2): {id, titel, frage, lage:[{label,wert}], optionen:[{text,richtig}],
   erklaerung, ort}. Damit ist die Prüfung unabhängig davon, wann der echte Generator (W1) landet,
   und der Rückfall ohne Modul bleibt messbar. Ohne require im Testbereich steigen die Tests
   sichtbar aus – der Name sagt es. */

/* ================= Umgebung ================= */
const KF_KANN_LADEN = (() => {
  try { return typeof require === "function" && typeof document === "undefined"; }
  catch (e) { return false; }
})();
const KF_ZUSATZ = KF_KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

/* ================= DOM-Ersatz (nur für den vm-Bereich) ================= */
function kf2Knoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, listeners: {}, className: "", _text: "", hidden: false, title: "",
    parentNode: null, disabled: false,
    style: {_p: {}, setProperty(k, v){ el.style._p[k] = String(v); }, removeProperty(k){ delete el.style._p[k]; }, getPropertyValue(k){ return el.style._p[k] || ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); if (k === "hidden") el.hidden = true; if (k === "disabled") el.disabled = true; },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
    querySelector(sel){ return kf2Finde(el, sel)[0] || null; },
    querySelectorAll(sel){ return kf2Finde(el, sel); },
    classList: {
      _l(){ return String(el.className || "").split(/\s+/).filter(Boolean); },
      _s(l){ el.className = l.join(" "); },
      add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
      remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
      toggle(x, an){ const an2 = an === undefined ? !el.classList.contains(x) : !!an; if (an2) el.classList.add(x); else el.classList.remove(x); return an2; },
      contains(x){ return el.classList._l().includes(x); },
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(kf2Text).join("") : el._text; },
    get lastElementChild(){ return el.kinder.filter(k => k && k.tag).slice(-1)[0] || null; },
    get children(){ return el.kinder.filter(k => k && k.tag); },
  };
  return el;
}
function kf2Passt(el, sel){
  const s = String(sel).trim();
  if (/^[a-z][a-z0-9]*$/i.test(s)) return el.tag === s;
  const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
  return teile.length > 0 && teile.every(t => {
    if (t.startsWith(".")) return String(el.className || "").split(/\s+/).includes(t.slice(1));
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
    if (!m) return false;
    const wert = m[1] === "hidden" ? (el.hidden ? "" : undefined) : (m[1] === "disabled" ? (el.disabled ? "true" : undefined) : (m[1].startsWith("data-") ? el.dataset[m[1].slice(5)] : el.attrs[m[1]]));
    return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
  });
}
function kf2Unter(el){
  const out = [];
  const lauf = k => { for (const x of k.kinder) if (x && x.tag) { out.push(x); lauf(x); } };
  lauf(el);
  return out;
}
/* Unterstützt Nachfahren-Selektoren ("A B C") wie das echte DOM – die Testfragen brauchen sie
   (z. B. ".lk-kurz-fuss .lk-knopf-primaer"). Ohne das fände der Prüfstand nur Einzelklassen. */
function kf2Finde(el, sel){
  const teile = String(sel).trim().split(/\s+/).filter(Boolean);
  let aktuell = [el];
  for (const teil of teile){
    const naechste = [];
    for (const k of aktuell) for (const x of kf2Unter(k)) if (kf2Passt(x, teil) && !naechste.includes(x)) naechste.push(x);
    aktuell = naechste;
  }
  return aktuell;
}
function kf2Text(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }

/* ================= Prüfstand ================= */
/* Beispiel-Frage exakt in der Form des Vertrags (§ 2) – reale Werte aus dem Netz von salon-01. */
function kf2Frage(){
  return {
    id: "netz", titel: "Gleiches Netz?",
    frage: "Können PC-Kasse und Drucker sich ohne Router direkt erreichen?",
    lage: [
      {label: "PC-Kasse", wert: "192.168.110.36 /24"},
      {label: "Drucker", wert: "192.168.110.40 /24"},
    ],
    optionen: [
      {text: "Ja – beide liegen in 192.168.110.0/24", richtig: true},
      {text: "Nein – dazwischen muss ein Router vermitteln", richtig: false},
      {text: "Nur über das Standard-Gateway", richtig: false},
    ],
    erklaerung: "Beide Adressen liegen im selben /24-Netz – ein Router ist für dieses Gespräch nicht nötig.",
    ort: {art: "geraet", geraet: "kasse"},
  };
}
function kf2Instanz(){
  return {iid: "i1", kunde: "salon", netz: {geraete: {kasse: {ip: "192.168.110.36", maske: "255.255.255.0", an: true}, drucker: {ip: "192.168.110.40", maske: "255.255.255.0", an: true}}, kabel: []}};
}
function kf2Def(){
  return {id: "salon-01", kunde: "salon", titel: "Die Kasse findet niemanden", ziele: []};
}
/* Baut einen eigenen Bereich mit echtem dom.js/leiste.js und einem Stub-Spiel. */
function kf2Stand(o = {}){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const rufe = {modus: [], ansicht: [], oeffnen: [], springen: [], auswaehlen: [], groessen: [], zaehler: {fuer: 0}};
  const behaelter = kf2Knoten("div");
  const dokument = {
    createElement: tag => kf2Knoten(tag), createElementNS: (ns, tag) => kf2Knoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener(){}, documentElement: Object.assign(kf2Knoten("html"), {dataset: {}}), body: kf2Knoten("body"), activeElement: null,
  };
  const inst = o.ohneAuftrag ? null : (o.inst || kf2Instanz());
  const frage = o.frage !== undefined ? o.frage : kf2Frage();
  const kurzfrage = o.kurzfrage === undefined
    ? {fuer: () => { rufe.zaehler.fuer++; return frage; }}
    : o.kurzfrage;                                   /* null = Modul fehlt (Rückfall-Zweig) */
  const spiel = {
    _st: {aktiv: inst ? inst.iid : null},
    aktiveInstanz: () => inst,
    defVon: () => (o.ohneAuftrag ? null : (o.def || kf2Def())),
    kurzfrage,
    niveauVon: () => "AP1",
    kundenDaten: id => ({name: "Salon Lockenwerk", symbol: "✂"}),
    postfach: () => [],
    karriere: {skillName: s => String(s || "")},
  };
  const bereich = {
    console: {log(){}, error(){}, warn(){}, info(){}},
    document: dokument, store: {get: () => ({})}, Bus: {an(){}, senden(){}},
    Spiel: spiel, DATEN: {kunden: {}, skills: []}, L: {}, eur: x => String(x), zahlDe: x => String(x),
    klemme: (x, a, b) => Math.min(b, Math.max(a, x)), heute: () => "2026-10-31", datumDe: x => String(x), jetzt: () => 0,
    requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
    setTimeout: () => 0, clearTimeout(){},
    Plattform: {name: "browser", kann: () => ({ja: false, grund: "Prüfstand"}), fenster: {groesse: (b, h) => { rufe.groessen.push([b, h]); return Promise.resolve(); }}},
  };
  vm.createContext(bereich);
  Object.assign(bereich, {__rufe: rufe});
  const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(quelle("dom.js"), bereich, {filename: "ui/dom.js"});
  vm.runInContext([
    "UI.symbol = (n, g) => sv('svg', {class: 'sym-' + n, width: g || 16});",
    "UI.modus = m => { globalThis.__rufe.modus.push(m); return m; };",
    "UI.bewegung = () => 'aus';",
    "UI.toast = () => {};",
    "UI.app = {registrieren(){}, aktualisieren(){}, aktuell: null, ansicht: n => { globalThis.__rufe.ansicht.push(n); UI.app.aktuell = n; }};",
    "UI.spiel = {inst: null, oeffnen(iid){ globalThis.__rufe.oeffnen.push(iid); }, mappeZu(){}, mappeAuf(){}, status(){}};",
    "UI.labor = {auswaehlen(id, port){ globalThis.__rufe.auswaehlen.push([id, port || null]); }};",
    o.fehlerziel === false ? "UI.fehlerziel = undefined;" : "UI.fehlerziel = {springen: z => { globalThis.__rufe.springen.push(z); return {ok: true, schritte: [], grund: null}; }};",
  ].join("\n"), bereich);
  vm.runInContext(quelle("leiste.js"), bereich, {filename: "ui/leiste.js"});
  vm.runInContext("globalThis.__p = {UI: UI};", bereich);
  return {UI: bereich.__p.UI, behaelter, rufe, inst};
}
function kf2Aufbauen(o){
  const p = kf2Stand(o);
  p.UI.leiste.aufbauen(p.behaelter);
  return p;
}
function kf2Uebung(p){ return p.behaelter.querySelector(".lk-uebung"); }
function kf2Oeffnen(p){
  p.UI.leiste.aufklappen();
  const schalter = p.behaelter.querySelector(".lk-uebung .lk-link-stark");
  if (schalter) schalter.click();
}
function kf2Css(){
  const fs = require("fs"), path = require("path");
  return fs.readFileSync(path.join(__dirname, "..", "src", "stil", "leiste.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

gruppe("UI: Leisten-Kurzübung mit Kontextfrage und Lage-Block (Runde 6)", () => {

  pruefe("Bei offenem Auftrag rendert die Leiste Mikrolabel, Kontextzeile, Lage-Block, Frage und drei Antworten" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({});
    const uebung = kf2Uebung(p);
    erwarte.wahr(!!uebung, "das Kurzübung-Modul steht");
    /* Zugeklappt: Einladung + Kontextzeile, aber keine Frage (CSS) – Ruhe 300 px bleibt. */
    erwarte.falsch(uebung.classList.contains("lk-offen"), "zugeklappt zu Beginn");
    erwarte.passt(kf2Css(), /\.lk-uebung:not\(\.lk-offen\)[^{]*\.lk-kurz[^{]*\{display:none/, "die Kontextfrage ist zugeklappt unsichtbar");
    /* Mikrolabel: KURZÜBUNG · <q.titel> (CSS setzt in Versalien). */
    erwarte.enthaelt(uebung.querySelector(".lk-modul-kopf .lk-kicker").textContent, "Kurzübung · Gleiches Netz?", "Kicker nennt die Art der Frage");
    erwarte.gleich(uebung.querySelector(".lk-kontext").textContent, "Zum Auftrag: Salon Lockenwerk · Die Kasse findet niemanden", "Kontextzeile aus Kunde und Auftrag");
    /* Öffnen: Kontextfrage-Zweig, Karte wächst über die alten 480 px hinaus. */
    kf2Oeffnen(p);
    erwarte.wahr(uebung.classList.contains("lk-kurzzweig"), "der Kontext-Zweig ist aktiv");
    erwarte.wahr(uebung.classList.contains("lk-offen"), "nach dem Klick geöffnet");
    erwarte.wahr(p.behaelter.querySelector(".leiste-karte").classList.contains("uebung-offen"), "die Karte wächst mit");
    const letzte = p.rufe.groessen[p.rufe.groessen.length - 1];
    erwarte.gleich(letzte[0], 320, "Breite bleibt Vertrag");
    erwarte.wahr(letzte[1] >= 560, "Höhe reicht für Lage + Frage + drei Antworten (mind. 560; am DOM wird nachgemessen): " + JSON.stringify(letzte));
    /* Lage-Block: Mikrolabel und je Zeile Label : Wert in Mono. */
    const lage = uebung.querySelector(".lk-kurz-lage");
    erwarte.wahr(!!lage, "der Lage-Block steht da");
    erwarte.enthaelt(lage.querySelector(".lk-kicker").textContent.toLowerCase(), "lage zum auftrag");
    const zeilen = lage.querySelectorAll(".lk-kurz-lage-zeile");
    erwarte.gleich(zeilen.length, 2, "2–4 Lage-Zeilen; hier zwei");
    erwarte.gleich(zeilen.map(z => z.querySelector(".lk-kurz-lage-label").textContent), ["PC-Kasse", "Drucker"]);
    erwarte.gleich(zeilen.map(z => z.querySelector(".lk-kurz-lage-wert").textContent), ["192.168.110.36 /24", "192.168.110.40 /24"]);
    /* Frage und drei Antwortflächen in der Reihenfolge des Vertrags. */
    erwarte.gleich(uebung.querySelector(".lk-kurz-frage").textContent, kf2Frage().frage);
    const opt = uebung.querySelectorAll(".lk-kurz-opt");
    erwarte.gleich(opt.length, 3, "genau drei Antwortflächen");
    erwarte.gleich(opt.map(o => o.textContent), kf2Frage().optionen.map(o => o.text));
    erwarte.gleich(opt.map(o => o.getAttribute("disabled")), [null, null, null], "vor der Antwort alle offen");
    erwarte.gleich(uebung.querySelector(".lk-kurz-antwort"), null, "ohne Antwort noch keine Erklärung");
  });

  pruefe("Die Antwortflächen sind mindestens 32 px hoch – groß genug für zwei Zeilen" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const css = kf2Css();
    erwarte.passt(css, /\.lk-kurz-opt\{[^}]*min-height:32px/, "min-height 32 px steht in der Regel");
    erwarte.passt(css, /\.lk-kurz-opt\{[^}]*text-align:left/, "Antworttext steht links (besser lesbar als zentriert)");
    /* Kein Fokusklau: die Optionen tragen tabindex -1 (nur Maus, wie die ganze Leiste). */
    const p = kf2Aufbauen({});
    kf2Oeffnen(p);
    for (const o of kf2Uebung(p).querySelectorAll(".lk-kurz-opt")) erwarte.gleich(o.getAttribute("tabindex"), "-1", "Antwort ohne Tastaturfokus");
  });

  pruefe("Ein Klick zeigt die Erklärung, markiert richtig/falsch und sperrt weitere Versuche" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({});
    kf2Oeffnen(p);
    const uebung = kf2Uebung(p);
    /* Falsche Antwort (Index 1) wählen. */
    uebung.querySelectorAll(".lk-kurz-opt")[1].click();
    const erklaerung = uebung.querySelector(".lk-kurz-erklaerung");
    erwarte.wahr(!!erklaerung, "die Erklärung erscheint");
    erwarte.enthaelt(erklaerung.textContent, "Nicht ganz.", "das Urteil nennt den Fehlversuch");
    erwarte.enthaelt(erklaerung.textContent, kf2Frage().erklaerung, "die Erklärung kommt aus der Frage (keine zweite Wahrheit)");
    erwarte.gleich(uebung.querySelector(".lk-kurz-opt.richtig").textContent, kf2Frage().optionen[0].text, "die richtige Option ist markiert");
    erwarte.gleich(uebung.querySelectorAll(".lk-kurz-opt.falsch").length, 1, "genau die gewählte falsche Option ist markiert");
    erwarte.gleich(uebung.querySelectorAll(".lk-kurz-opt[disabled]").length, 3, "weitere Versuche sind gesperrt");
    erwarte.wahr(uebung.classList.contains("lk-fertig"), "das Modul steht im Antwort-Zustand");
    /* Zweiter Klick ändert nichts mehr (kein neuer Versuch). */
    const vorher = erklaerung.textContent;
    uebung.querySelectorAll(".lk-kurz-opt")[0].click();
    erwarte.gleich(kf2Uebung(p).querySelector(".lk-kurz-erklaerung").textContent, vorher, "die Antwort bleibt bestehen");
    erwarte.gleich(kf2Uebung(p).querySelectorAll(".lk-kurz-opt.falsch").length, 1, "die Markierung bleibt");
  });

  pruefe("Die feste Aktion „Im Labor prüfen\" führt über q.ort ans Gerät" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({});
    kf2Oeffnen(p);
    kf2Uebung(p).querySelectorAll(".lk-kurz-opt")[1].click();
    const aktion = kf2Uebung(p).querySelector(".lk-kurz-fuss .lk-knopf-primaer");
    erwarte.wahr(!!aktion, "die feste Aktion steht im Antwort-Bereich");
    erwarte.gleich(aktion.textContent, "Im Labor prüfen");
    aktion.click();
    erwarte.gleich(p.rufe.modus.filter(m => m === "voll").length, 1, "die Vollansicht wird geöffnet");
    erwarte.enthaelt(p.rufe.ansicht.join(","), "labor", "und zwar die Labor-Ansicht");
    erwarte.gleich(p.rufe.springen.length, 1, "der Resolver UI.fehlerziel.springen bekommt den Ort");
    erwarte.gleich(p.rufe.springen[0], kf2Frage().ort, "genau q.ort (Gerät aus der Frage)");
  });

  pruefe("Ohne UI.fehlerziel wählt der Rückfall das Gerät der Frage defensiv aus" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({fehlerziel: false});
    kf2Oeffnen(p);
    kf2Uebung(p).querySelectorAll(".lk-kurz-opt")[0].click();
    kf2Uebung(p).querySelector(".lk-kurz-fuss .lk-knopf-primaer").click();
    erwarte.enthaelt(p.rufe.ansicht.join(","), "labor");
    erwarte.gleich(p.rufe.springen, [], "ohne Resolver kein Aufruf");
    erwarte.gleich(p.rufe.auswaehlen, [["kasse", null]], "das Gerät wird stattdessen ausgewählt");
  });

  pruefe("Erneutes Öffnen derselben Instanz behält die Antwort (lokal je iid, kein Spielzustand)" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({});
    kf2Oeffnen(p);
    kf2Uebung(p).querySelectorAll(".lk-kurz-opt")[1].click();
    p.UI.leiste.abbauen();
    p.UI.leiste.aufbauen(p.behaelter);
    const uebung = kf2Uebung(p);
    erwarte.wahr(uebung.classList.contains("lk-fertig"), "der Antwort-Zustand ist nach dem Neuaufbau da");
    erwarte.wahr(uebung.classList.contains("lk-offen"), "und die Erklärung bleibt sichtbar (offen)");
    erwarte.enthaelt(uebung.querySelector(".lk-kurz-erklaerung").textContent, kf2Frage().erklaerung);
    erwarte.gleich(uebung.querySelectorAll(".lk-kurz-opt[disabled]").length, 3, "keine neuen Versuche");
    erwarte.gleich(p.UI.leiste.zustand && typeof p.UI.leiste.status, "function", "der Weg über status bleibt heil");
  });

  pruefe("Die Frage wird je Instanz gecacht – Neuzeichnen erzeugt keine neue, eine Netz-Änderung schon" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({});
    erwarte.gleich(p.rufe.zaehler.fuer, 1, "beim Aufbau genau einmal erzeugt");
    p.UI.leiste.status({offen: 1});
    p.UI.leiste.status({offen: 2, ruf: 5});
    erwarte.gleich(p.rufe.zaehler.fuer, 1, "Neuzeichnen nutzt die gemerkte Frage");
    erwarte.gleich(kf2Uebung(p).querySelector(".lk-kurz-frage").textContent, kf2Frage().frage, "und zeigt dieselbe Frage");
    /* Echte Netz-Änderung: der Cache-Schlüssel enthält den Gerätezustand – der Generator wird neu gefragt. */
    p.inst.netz.geraete.kasse.an = false;
    p.UI.leiste.status({offen: 3});
    erwarte.gleich(p.rufe.zaehler.fuer, 2, "nach einer Änderung am Netz entsteht die Frage neu");
  });

  pruefe("Ohne verwertbare Frage zeigt die Leiste keinen Quiz, sondern Hinweis und „Im Labor öffnen\"" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({kurzfrage: {fuer: () => null}});   /* Modul da, liefert aber keine Frage */
    const uebung = kf2Uebung(p);
    erwarte.wahr(uebung.classList.contains("lk-leerstand"), "der ehrliche Leer-Zustand ist aktiv");
    erwarte.gleich(uebung.querySelector(".lk-kurz-frage"), null, "keine Frage im DOM");
    erwarte.gleich(uebung.querySelectorAll(".lk-kurz-opt").length, 0, "keine Antwortflächen");
    erwarte.enthaelt(uebung.querySelector(".lk-leer").textContent, "keine Kurzfrage", "der Satz sagt ehrlich, warum");
    erwarte.passt(kf2Css(), /\.lk-uebung\.lk-leerstand \.lk-link[^{]*\{display:none/, "der Antworten-Schalter verschwindet (nichts zu öffnen)");
    const weg = uebung.querySelector(".lk-uebung-weg .lk-knopf");
    erwarte.wahr(!!weg, "der Weg ins Labor steht da");
    erwarte.gleich(weg.textContent, "Im Labor öffnen");
    weg.click();
    erwarte.enthaelt(p.rufe.modus.join(","), "voll", "öffnet die Vollansicht");
    erwarte.enthaelt(p.rufe.ansicht.join(","), "labor", "und die Labor-Ansicht");
  });

  pruefe("Ohne offenen Auftrag kein Quiz – ehrlicher Satz, Weg ins Postfach" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({ohneAuftrag: true});
    const uebung = kf2Uebung(p);
    erwarte.wahr(uebung.classList.contains("lk-leerstand"));
    erwarte.gleich(uebung.querySelector(".lk-kurz-frage"), null);
    erwarte.enthaelt(uebung.querySelector(".lk-leer").textContent, "Ohne laufenden Auftrag");
    const weg = uebung.querySelector(".lk-uebung-weg .lk-knopf");
    erwarte.gleich(weg.textContent, "Im Labor öffnen");
    weg.click();
    erwarte.enthaelt(p.rufe.ansicht.join(","), "postfach", "ohne Auftrag führt der Weg ins Postfach");
    erwarte.enthaelt(p.rufe.modus.join(","), "voll");
  });

  pruefe("Ohne Kurzfragen-Modul bleibt das generische Mini-System funktionsfähig (Rückfall)" + KF_ZUSATZ, () => {
    if (!KF_KANN_LADEN) return;
    const p = kf2Aufbauen({kurzfrage: null});      /* Fassung ohne src/spiel/kurzfrage.js */
    const uebung = kf2Uebung(p);
    erwarte.wahr(uebung.classList.contains("lk-minizweig"), "der Mini-Zweig ist der Rückfall");
    erwarte.wahr(!!uebung.querySelector(".lk-mini"), "der Mini-Bereich bleibt da (UI.leiste.miniBereich)");
    erwarte.gleich(uebung.querySelectorAll(".lk-kurz-frage").length, 0, "keine erfundene Kontextfrage");
    erwarte.wahr(!!uebung.querySelector(".lk-mini-hilfe"), "auch der Hilfe-Bereich bleibt");
    erwarte.gleich(p.behaelter.querySelector(".lk-zeile").children.length, 6, "Testhaken: die Statuszeile hat sechs Kinder");
  });
});