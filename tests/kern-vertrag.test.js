"use strict";
/* VERTRAG: §-Zitate und §3/§4/§8-Namen (KRN-01)
   MATCHER: „Architektur § N[.m…]“ und „Architektur.md § N[.m…]“ — genau diese Form, auch
   mehrfach in einer Zeile (z. B. „Architektur § 10.3/§ 10.4“). Zitate werden in src/
   (*.js,*.css,*.html), tests/ (*.js) und docs/ (*.md) gesucht.
   AUSNAHMEN (Lead-Beschluss 31.10.2026):
   · docs/doku/** und docs/index.html (erzeugte Doku-Seite) und die Wurzel-Einzeldatei
     Netzwerk-Labor.html (erzeugt).
   · Historische CHANGELOG-Abschnitte: alles außerhalb des NEUESTEN ##-Abschnitts in
     docs/CHANGELOG.md (deckt dort §19/§20/§18.16). §11/§14/§19/§20 werden deshalb NICHT
     angelegt — es gibt keine nicht-historischen Zitate; der Test prüft das ausdrücklich.
   · Externe Quellen stehen als Allowlist KV_EXTERN (Datei:Zeile:§); heute leer.
   · Linkform „[Architektur.md](…Architektur.md) (z. B. § 18 …)“ in
     docs/entwicklung/Übergabe – Stand 29.10.2026 – Frontend-Redesign.md:119 erfüllt den
     Matcher nicht (Markdown dazwischen); §18 existiert trotzdem, daher kein Sonderfall.
   ZIEL: jede verbleibende Zitatstelle hat eine Überschrift ^#{2,4} N(.m)* in docs/Architektur.md.
   NAMEN: §3/§4/§8 werden geschnitten; jeder dort genannte Code-Name (in Backticks) muss im
   Code existieren, und jeder Export von IP/store/Bus/Zufall/Modell/Plattform muss im
   jeweiligen Vertragsabschnitt stehen. Plattform wird nur in eigenen vm-Bereichen geladen. */
const KV_WURZEL = require("path").join(__dirname, "..");
const KV_FS = require("fs");
const KV_QUELLE = /Architektur(?:\.md)? §\s*(\d+(?:\.\d+)*)/g;
const KV_EXTERN = [
];
const KV_RAUS = ["doku", ".git", "node_modules", "target", "web", "android", "Programm", "Nachweise"];
const KV_LISTE = (() => {
  const path = require("path"), raus = [];
  const lauf = (ordner, test) => {
    for (const e of KV_FS.readdirSync(ordner, {withFileTypes: true})) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) { if (!KV_RAUS.includes(e.name)) lauf(p, test); }
      else if (test(p)) raus.push(p);
    }
  };
  lauf(path.join(KV_WURZEL, "src"), p => /\.(js|css|html)$/.test(p));
  lauf(path.join(KV_WURZEL, "tests"), p => /\.js$/.test(p));
  lauf(path.join(KV_WURZEL, "docs"), p => /\.md$/.test(p));
  return raus.filter(p => !p.endsWith(require("path").join("tests", "kern-vertrag.test.js")));
})();
const KV_CACHE = {};
function kvZeilen(p) { return (KV_CACHE[p] ||= KV_FS.readFileSync(p, "utf8").split(/\r?\n/)); }
function kvUeberschriften() {
  const nummern = new Set();
  for (const z of kvZeilen(KV_WURZEL + "/docs/Architektur.md")) {
    const m = /^(#{2,4})\s+(\d+(?:\.\d+)*)(?:\s|·|$)/.exec(z);
    if (m) nummern.add(m[2]);
  }
  return nummern;
}
function kvHistorie(datei, zeile) {
  if (!datei.endsWith("CHANGELOG.md")) return false;
  const zeilen = kvZeilen(datei), anfang = [];
  for (let i = 0; i < zeilen.length; i++) if (/^## /.test(zeilen[i])) anfang.push(i + 1);
  return anfang.length > 0 && (zeile < anfang[0] || zeile >= (anfang[1] || zeilen.length + 1));
}
function kvZitate() {
  const raus = [];
  for (const datei of KV_LISTE) {
    const zeilen = kvZeilen(datei);
    for (let i = 0; i < zeilen.length; i++) {
      KV_QUELLE.lastIndex = 0; let m;
      while ((m = KV_QUELLE.exec(zeilen[i]))) {
        if (kvHistorie(datei, i + 1)) continue;
        const stelle = datei.slice(KV_WURZEL.length + 1) + ":" + (i + 1) + ":§" + m[1];
        if (KV_EXTERN.includes(stelle)) continue;
        raus.push({datei: datei.slice(KV_WURZEL.length + 1), zeile: i + 1, nr: m[1]});
      }
    }
  }
  return raus;
}
function kvAbschnitt(nr) {
  const zeilen = kvZeilen(KV_WURZEL + "/docs/Architektur.md");
  const anfang = zeilen.findIndex(z => new RegExp("^## " + nr + " ·").test(z));
  if (anfang < 0) return "";
  let ende = zeilen.length;
  for (let i = anfang + 1; i < zeilen.length; i++) if (/^## /.test(zeilen[i])) { ende = i; break; }
  return zeilen.slice(anfang, ende).join("\n");
}
const KV_VM = (() => {
  const path = require("path"), vm = require("vm");
  const W = path.join(KV_WURZEL, "src", "plattform");
  const quelle = n => KV_FS.readFileSync(path.join(W, n), "utf8");
  const lade = (dateien, bereich, name) => {
    vm.runInContext(dateien.map(n => quelle(n)).join("\n;\n") + "\n;globalThis.__KV = " + name + ";", bereich, {filename: "plattform/" + dateien.join("+")});
    return bereich.__KV;
  };
  const browser = lade(["plattform-browser.js"], vm.createContext({
    console: {log(){}, error(){}, warn(){}}, setTimeout, clearTimeout, navigator: {platform: "test"},
    localStorage: {getItem(){ return null; }, setItem() {}}, Bus: {senden(){}},
  }), "PlattformBrowser");
  const tauri = lade(["plattform-tauri.js"], vm.createContext({
    console: {log(){}, error(){}, warn(){}}, setTimeout, clearTimeout,
    window: {__TAURI__: {event: {listen(){}}, core: {invoke: () => Promise.resolve({})}}, addEventListener(){}},
    document: {readyState: "complete", addEventListener(){}, documentElement: {dataset: {}}, title: "x"},
    store: {get(){ return {}; }},
  }), "PlattformTauri");
  const plattform = lade(["plattform.js"], vm.createContext({
    console: {log(){}, error(){}}, setTimeout, clearTimeout, window: {__TAURI__: {}},
    PlattformBrowser: browser, PlattformTauri: tauri, LABOR_VERSION: "test",
  }), "Plattform");
  return {browser, tauri, plattform};
})();
const KV_REGISTER = {IP, store, Bus, Zufall, SPEICHER, Modell, Plattform: KV_VM.plattform};
function kvPfadLoest(pfad) {
  const teile = pfad.split(".");
  let o = KV_REGISTER[teile[0]];
  if (o === undefined) return false;
  for (let i = 1; i < teile.length; i++) {
    if (o == null || !(teile[i] in Object(o))) return false;
    o = o[teile[i]];
  }
  return true;
}
function kvNamen(quelle, bekannt) {
  const raus = new Set(), re = /\`([^\`]+)\`/g; let m;
  while ((m = re.exec(quelle))) {
    const token = m[1].trim().replace(/\(.*$/, "").trim();
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(token)) continue;
    if (bekannt.includes(token.split(".")[0])) raus.add(token);
  }
  return [...raus];
}
function kvExporte() {
  return {
    "§3": [...Object.keys(IP), ...Object.keys(store), ...Object.keys(Bus),
          ...Object.keys(Zufall(1)), "heute", "plusTage", "tageZwischen", "jetzt", "tief", "esc",
          "eur", "zahlDe", "klemme", "datumDe", "SPEICHER"],
    "§4": [...Object.keys(Modell), "verlauf"],
    /* §8 nennt die Untergruppen als Block (fenster:{…}, datei:{…}); geprüft wird der Name in §8. */
    "§8": Object.keys(KV_VM.plattform).concat(Object.keys(KV_VM.plattform.fenster), Object.keys(KV_VM.plattform.datei)),
  };
}
const KV_FLAECHEN = {
  "§3": {namen: ["IP", "store", "Bus", "Zufall", "SPEICHER"]},
  "§4": {namen: ["Modell"]},
  "§8": {namen: ["Plattform"]},
};
gruppe("Kern: Vertrag §-Zitate", () => {
  /* ALLE erwarte.* stehen in pruefe(...): Zusicherungen direkt im gruppe-Callback würden beim
     Laden der Testdatei ausgeführt und ein Fehlschlag dort bricht den ganzen Teststapel mit
     LADEFEHLER (Exit 2) ab — genau das ist beim W1-Gesamtlauf passiert. */
  pruefe("Zitatstellen: jede zitierte § hat eine Überschrift", () => {
    const ueberschriften = kvUeberschriften();
    const fehlt = kvZitate().filter(z => !ueberschriften.has(z.nr) && !ueberschriften.has(z.nr.split(".")[0]));
    const jeNr = {};
    for (const z of fehlt) (jeNr[z.nr.split(".")[0]] ||= []).push(z.datei + ":" + z.zeile + " §" + z.nr);
    const bekannt = ["1","2","3","4","5","6","7","8","9","12","21","22","23","24","25","26","10","13","15","16","17","18"];
    for (const nr of bekannt) erwarte.gleich((jeNr[nr] || []).length, 0, "§" + nr + " ohne Ziel: " + (jeNr[nr] || []).join(", "));
  });
  pruefe("Nachzug: alle zitierten Unterabschnitte als Überschrift", () => {
    const ueberschriften = kvUeberschriften();
    const liste = ["10","10.1","10.2","10.3","10.4","10.5","10.6",
                   "13","13.1","13.2","13.3", "15","15.2",
                   "16","16.1","16.2","16.3","16.4","16.5",
                   "17","17.1","17.2","17.3","17.4","17.5","17.7","17.9",
                   "18","18.5"];
    for (const nr of liste) erwarte.wahr(ueberschriften.has(nr), "Überschrift §" + nr + " fehlt in docs/Architektur.md");
    for (const nr of ["11","14","19","20"]) erwarte.falsch(ueberschriften.has(nr), "§" + nr + " darf es nicht geben (nur CHANGELOG-Historie)");
  });
});
gruppe("Kern: Vertrag §3/§4/§8", () => {
  for (const [name, flaeche] of Object.entries(KV_FLAECHEN)) {
    const text = kvAbschnitt(name.slice(1));
    pruefe(name + ": Fläche vorhanden", () => {
      erwarte.wahr(text.length > 0, name + " nicht gefunden");
      for (const grund of flaeche.namen) erwarte.wahr(text.includes(grund), name + " nennt " + grund + " nicht");
    });
    pruefe(name + ": jeder genannte Name existiert im Code", () => {
      erwarte.gleich(kvNamen(text, flaeche.namen).filter(p => !kvPfadLoest(p)).join(", "), "", name + ": Namen ohne Code");
    });
    pruefe(name + ": jeder Export steht im Vertrag", () => {
      const fehltNamen = kvExporte()[name].filter(n => !new RegExp("(?<![\\w$])" + n.replace(/[.]/g, "\\.") + "(?![\\w$])").test(text));
      erwarte.gleich(fehltNamen.join(", "), "", name + ": Exporte ohne Vertrag");
    });
  }
});
