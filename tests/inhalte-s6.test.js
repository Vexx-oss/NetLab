"use strict";
/* ---------- S6a/S6b: IPv6, Betrieb/Überwachung, WLAN (Architektur § 17.1/§ 17.7) ----------
   Neuer Test des O4-Owners für die drei am 29.10.2026 ANS ENDE angehängten Fertigkeiten.
   Geprüft wird am echten Bestand, nicht am Augenschein:
     1) Append-only: 0–26 unverändert, 27–29 exakt lab.ipv6/lab.betrieb/lab.wlan (ap/stufe § 17.1),
     2) Wiki: 3 Seiten, Pflichtfelder, >=4 Abschnitte, Belege (RFC/BSI/IEEE/Wi-Fi), ehrliche Sim-Grenze,
     3) Minis 6/6/8 in Hausform; Denkhilfe je Mini (kein Lösungstext, keine Option, Stichwort NICHT auf
        der Wiki-Seite, Ausschnitt wörtlich aus der Aufgabe),
     4) Trainings: lab.betrieb >=1, lab.ipv6/lab.wlan namentlich OHNE Training (§ 17.1), Szenario über
        Spiel.instanzErstellen baubar, geraet aus den Injektoren GEMESSEN, quelle aus Wiki/Lehrtexten,
     5) Injektoren: lab.betrieb über vorhandene Störungs-Injektoren gedeckt; ipv6/wlan ohne Schein-Injektor,
     6) Rotation: 300 Züge Spiel.mini.naechstes() – alle 20 neuen Minis kommen wirklich vor.
   Reine Daten, kein DOM; deterministisch. */
gruppe("S6a/S6b: IPv6, Betrieb, WLAN (O4)", () => {
  const NEU = ["lab.ipv6", "lab.betrieb", "lab.wlan"];
  const SKILLS_VORHER = [
    "lab.link", "lab.ip", "lab.netz", "lab.gateway", "lab.arp", "lab.ping", "lab.switch", "lab.subnetz",
    "lab.dhcp", "lab.dns", "lab.ports", "lab.tcp", "lab.cli", "lab.speichern", "lab.vlan", "lab.trunk",
    "lab.rostick", "lab.acl", "lab.route", "lab.ttl", "lab.nat", "lab.portfwd", "lab.fw", "lab.dmz",
    "lab.portsec", "lab.stp", "lab.storage",
  ];
  const klein = x => String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim();
  const wikiSeite = id => (DATEN.wiki || {})[id] || null;
  const wikiSichtbar = id => {
    const w = wikiSeite(id);
    if (!w) return "";
    return [w.titel, w.kurz, w.merksatz, w.pruefungstipp, w.quelle,
      ...(w.abschnitte || []).map(a => (a.titel || "") + " " + (a.html || ""))].filter(Boolean).join(" ").toLowerCase();
  };
  const optionen = m => m.art === "zuordnen" ? [...m.optionen.links, ...m.optionen.rechts] : m.optionen;
  const minis = () => DATEN.mini.filter(m => NEU.includes(m.skill));
  const trainings = () => DATEN.trainings.filter(t => NEU.includes(t.skill));
  const hatInjektor = skill => Object.values(Spiel.INJEKTOREN || {}).some(i => (i.skills || []).includes(skill));
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, einstG: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 6;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.einstG || {});
    }
  };

  pruefe("Append-only: 0–26 unverändert, 27–29 exakt die drei S6-Fertigkeiten (ap/stufe § 17.1)", () => {
    erwarte.gleich(DATEN.skills.length, 30, "30 Fertigkeiten");
    erwarte.gleich(new Set(DATEN.skills.map(s => s.id)).size, 30, "keine doppelte Fertigkeit");
    erwarte.gleich(DATEN.skills.slice(0, 27).map(s => s.id), SKILLS_VORHER, "die alten 27 stehen unverändert vorn (Indizes 0–26)");
    erwarte.gleich(DATEN.skills.slice(27).map(s => s.id), NEU, "die neuen drei stehen ANS ENDE (27–29)");
    const S = Object.fromEntries(DATEN.skills.map(s => [s.id, s]));
    erwarte.gleich([S["lab.ipv6"].ap, S["lab.ipv6"].stufe], ["AP1", 5], "lab.ipv6: AP1, Stufe 5");
    erwarte.gleich([S["lab.betrieb"].ap, S["lab.betrieb"].stufe], ["AP2", 5], "lab.betrieb: AP2, Stufe 5");
    erwarte.gleich([S["lab.wlan"].ap, S["lab.wlan"].stufe], ["AP1", 5], "lab.wlan: AP1, Stufe 5");
    for (const id of NEU) erwarte.wahr(String(S[id].name).trim().length >= 5, id + ": Name gefüllt");
  });

  pruefe("Wiki: drei Seiten mit Pflichtfeldern, >=4 Abschnitten, Belegen und ehrlicher Sim-Grenze", () => {
    const PFLICHT = ["titel", "kurz", "abschnitte", "merksatz", "pruefungstipp", "quelle", "belege", "siehe"];
    const TAGS = new Set(["p", "ul", "ol", "li", "code", "b", "strong", "i", "em", "table", "tr", "th", "td", "pre", "sup", "sub", "br"]);
    for (const id of NEU) {
      const w = wikiSeite(id);
      erwarte.wahr(!!w, id + ": Wiki-Seite fehlt");
      if (!w) continue;
      for (const f of PFLICHT) erwarte.wahr(Object.prototype.hasOwnProperty.call(w, f) && w[f] != null && String(w[f]).trim() !== "", id + ": Pflichtfeld " + f);
      erwarte.wahr(Array.isArray(w.abschnitte) && w.abschnitte.length >= 4, id + ": mindestens 4 Abschnitte, sind " + ((w.abschnitte || []).length));
      for (const a of w.abschnitte) {
        erwarte.wahr(typeof a.titel === "string" && a.titel.trim().length >= 3, id + ": Abschnittstitel fehlt");
        erwarte.wahr(typeof a.html === "string" && a.html.trim().length >= 40, id + ": Abschnitt " + a.titel + " zu knapp");
        const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
        let m;
        while ((m = re.exec(a.html)) !== null) {
          erwarte.wahr(TAGS.has(m[1].toLowerCase()), id + " / " + a.titel + ": unerlaubter Tag " + m[1]);
          erwarte.gleich(String(m[2] || "").trim(), "", id + " / " + a.titel + ": Tag mit Attribut");
        }
      }
      erwarte.wahr(wikiSichtbar(id).length >= 1500, id + ": Seite ist inhaltlich gefüllt (" + wikiSichtbar(id).length + " Zeichen)");
      for (const z of w.siehe || []) {
        erwarte.wahr((DATEN.skills || []).some(s => s.id === z), id + ": siehe-Verweis auf echte Fertigkeit " + z);
        erwarte.wahr(!!wikiSeite(z), id + ": siehe-Verweis hat eine Seite " + z);
      }
      /* Ehrliche Grenze: ein Abschnitt nennt sie ausdrücklich (§ 17.1). */
      const grenze = (w.abschnitte || []).some(a => /Grenze|Im Labor/i.test(a.titel || "") && /inhaltlich|nicht paketweise|echte Systeme|nicht ausgeführt|kein WLAN|keine IPv6/i.test(a.html || ""));
      erwarte.wahr(grenze, id + ": ehrliche Sim-Grenze fehlt");
    }
    /* Belege: IPv6 braucht RFC, WLAN IEEE/BSI/Wi-Fi (Quellen-Entscheidung Lead: Wi-Fi Alliance zulässig). */
    erwarte.passt(wikiSeite("lab.ipv6").belege, /RFC \d/, "lab.ipv6: RFC-Beleg");
    erwarte.passt(wikiSeite("lab.ipv6").belege, /RFC 4291|RFC 4861|RFC 4862/, "lab.ipv6: Adress-/NDP-/SLAAC-Beleg");
    erwarte.passt(wikiSeite("lab.wlan").belege, /IEEE|BSI|Wi-Fi/, "lab.wlan: IEEE/BSI/Wi-Fi-Beleg");
    erwarte.passt(wikiSeite("lab.betrieb").belege, /RFC \d|BSI/, "lab.betrieb: RFC/BSI-Beleg");
    /* Wiki-Liste der Ansicht: 30 Fertigkeiten + 2 Zusatzseiten = 32 (Quelle: DATEN.wikiZusatz). */
    erwarte.gleich(Object.keys(DATEN.wiki || {}).length, DATEN.skills.length + (DATEN.wikiZusatz || []).length, "Wiki-Seiten = Fertigkeiten + Zusatzseiten (32)");
  });

  pruefe("Minis 6/6/8 in Hausform, mit Denkhilfe (denkt statt verrät) und Stichwort NICHT auf der Wiki-Seite", () => {
    const zahl = Object.fromEntries(NEU.map(id => [id, minis().filter(m => m.skill === id).length]));
    erwarte.gleich([zahl["lab.ipv6"], zahl["lab.betrieb"], zahl["lab.wlan"]], [6, 6, 8], "Minis je Fertigkeit: 6/6/8");
    const fehler = [];
    for (const m of minis()) {
      for (const k of ["id", "skill", "stufe", "art", "frage", "optionen", "erklaerung", "quelle"]) if (m[k] == null || m[k] === "") fehler.push(m.id + ": Feld " + k);
      if (!["E", "AP1", "AP2"].includes(m.stufe)) fehler.push(m.id + ": Stufe " + m.stufe);
      if (!["wahl", "vorhersage", "reihenfolge", "zuordnen"].includes(m.art)) fehler.push(m.id + ": Art " + m.art);
      if (m.frage.length > 140) fehler.push(m.id + ": Frage " + m.frage.length + " Zeichen");
      const max = m.art === "zuordnen" ? 40 : 60;
      for (const o of optionen(m)) if (String(o).length > max) fehler.push(m.id + ": Option zu lang (" + o + ")");
      if (m.art !== "zuordnen" && m.optionen.length > 4) fehler.push(m.id + ": mehr als 4 Optionen");
      if (!Spiel.mini.pruefen(m, m.richtig)) fehler.push(m.id + ": markierte Antwort nicht lösbar");
      if (m.schnappschuss) {
        const z = String(m.schnappschuss.inhalt || "").split("\n");
        if (z.length > 7) fehler.push(m.id + ": Schnappschuss zu viele Zeilen");
        for (const l of z) if (l.length > 44) fehler.push(m.id + ": Schnappschuss-Zeile zu lang");
      }
      const e = (DATEN.miniDenkhilfen || {})[m.id];
      if (!e) { fehler.push(m.id + ": keine Denkhilfe"); continue; }
      if (typeof e.denkhilfe !== "string" || e.denkhilfe.trim().length < 30) fehler.push(m.id + ": Denkhilfe zu knapp");
      for (const k of Object.keys(e)) if (!["denkhilfe", "ausschnitt", "stichwort"].includes(k)) fehler.push(m.id + ": unbekanntes Feld " + k);
      if (typeof e.stichwort !== "string" || !e.stichwort.trim()) fehler.push(m.id + ": Stichwort fehlt");
      else if (wikiSichtbar(m.skill).includes(klein(e.stichwort))) fehler.push(m.id + ": Stichwort steht auf der Wiki-Seite (" + e.stichwort + ")");
      const loesung = klein(Spiel.mini.loesungText(m));
      if (loesung && klein(e.denkhilfe).includes(loesung)) fehler.push(m.id + ": Denkhilfe enthält die Lösung");
      for (const o of optionen(m)) { const w = klein(o); if (w.length > 3 && klein(e.denkhilfe).includes(w)) fehler.push(m.id + ": Denkhilfe nennt eine Option (" + o + ")"); }
      if (e.ausschnitt) {
        const aufgabe = klein([m.frage, m.schnappschuss ? m.schnappschuss.inhalt : ""].join(" \n "));
        if (!aufgabe.includes(klein(e.ausschnitt))) fehler.push(m.id + ": Ausschnitt steht nicht wörtlich in der Aufgabe");
      }
    }
    erwarte.gleich(fehler.slice(0, 10), [], "Hausform/Denkhilfen-Fehler");
  });

  pruefe("Trainings: lab.betrieb >=1 (baubar, geraet gemessen, quelle belegt), lab.ipv6/lab.wlan namentlich ohne Training", () => {
    const je = Object.fromEntries(NEU.map(id => [id, trainings().filter(t => t.skill === id).map(t => t.id)]));
    erwarte.wahr(je["lab.betrieb"].length >= 1, "lab.betrieb hat ein Training");
    erwarte.gleich(je["lab.ipv6"], [], "lab.ipv6 OHNE Training (§ 17.1: kein Schein-Training)");
    erwarte.gleich(je["lab.wlan"], [], "lab.wlan OHNE Training (§ 17.1: kein Schein-Training)");
    const betrieb = trainings().filter(t => t.skill === "lab.betrieb");
    /* Geräteklasse aus den Injektoren messen – dieselbe Rechnung wie tests/daten-trainings.test.js. */
    const klassen = new Set();
    for (const inj of Object.values(Spiel.INJEKTOREN || {}).filter(i => (i.skills || []).includes("lab.betrieb"))) {
      for (const name of inj.vorlagen || []) {
        const V = (Spiel.vorlagen || {})[name];
        if (!V) continue;
        let w = null, kands = [];
        try { w = V.bauen(Zufall(1), {}); } catch (e) { continue; }
        try { kands = inj.passt(w.netz, w.rollen) || []; } catch (e) { kands = []; }
        for (const k of kands) { const g = w.netz.geraete[k.geraet || k.key]; if (g && g.typ) klassen.add(Spiel.HOSTTYPEN[g.typ] ? "host" : g.typ); }
      }
    }
    const soll = klassen.size === 0 ? null : (klassen.size === 1 ? [...klassen][0] : "alle");
    const bestand = skill => [...Object.values(DATEN.lehrtexte).filter(l => l.skill === skill).map(l => l.quelle || ""),
      (wikiSeite(skill) || {}).quelle || "", (wikiSeite(skill) || {}).belege || ""].join(" · ");
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      for (const t of betrieb) {
        erwarte.gleich(t.geraet, soll, t.id + ": geraet passt zu den Injektoren (" + [...klassen].sort().join(",") + ")");
        erwarte.wahr(t.quelle.trim().length >= 20, t.id + ": Quelle gefüllt");
        for (const teil of t.quelle.split(" · ")) erwarte.wahr(bestand(t.skill).includes(teil), t.id + ": Quellenteil belegt: " + teil);
        let ok = false, grund = "";
        try {
          const inst = Spiel.instanzErstellen({gen: {skill: t.skill, seed: 1, opts: {stufe: t.niveau}}, quelle: "training", ohneFlow: true});
          ok = !!(inst && inst.netz && Spiel.defVon(inst));
          if (!ok) grund = "keine auflösbare Instanz";
        } catch (e) { grund = e && e.message ? e.message : String(e); }
        erwarte.wahr(ok, t.id + ": über Spiel.instanzErstellen nicht baubar – " + grund);
      }
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    }
  });

  pruefe("Injektoren: lab.betrieb über vorhandene Störungs-Injektoren gedeckt, ipv6/wlan ohne Schein-Injektor", () => {
    const namen = name => Object.values(Spiel.INJEKTOREN || {}).filter(i => (i.skills || []).includes(name)).map(i => i.name);
    const betrieb = namen("lab.betrieb");
    erwarte.wahr(betrieb.length >= 1, "lab.betrieb hat mindestens einen Injektor, hat " + betrieb.length);
    erwarte.wahr(betrieb.includes("gespeichert-kaputt"), "Betriebsbezug Startkonfiguration/Backup fehlt (" + betrieb.join(",") + ")");
    erwarte.wahr(betrieb.includes("geraet-stromlos"), "Betriebsbezug Verfügbarkeit/Uptime fehlt (" + betrieb.join(",") + ")");
    erwarte.gleich(namen("lab.ipv6"), [], "lab.ipv6 hat keinen Schein-Injektor (keine Sim)");
    erwarte.gleich(namen("lab.wlan"), [], "lab.wlan hat keinen Schein-Injektor (keine Sim)");
    /* Jede in Injektoren genannte Fertigkeit muss es in DATEN.skills geben (keine erfundene). */
    const bekannt = new Set((DATEN.skills || []).map(s => s.id));
    const fremd = [];
    for (const i of Object.values(Spiel.INJEKTOREN || {})) for (const s of i.skills || []) if (!bekannt.has(s)) fremd.push(i.name + ": " + s);
    erwarte.gleich([...new Set(fremd)], [], "keine erfundene Fertigkeit in den Injektoren");
  });

  pruefe("Rotation: 300 Züge Spiel.mini.naechstes() – alle 20 neuen Minis kommen wirklich vor", kapsel(() => {
    Spiel._st.stufe = 6;
    Spiel._einst.wahl = "AP2";
    const gesehen = new Set();
    let zuege = 0;
    for (let i = 0; i < 300; i++) {
      const m = Spiel.mini.naechstes();
      if (!m) break;
      zuege++;
      if (!m.generiert && NEU.includes(m.skill)) gesehen.add(m.id);
      Spiel.mini.antworten(m.id, m.richtig);
    }
    const neuIds = minis().map(m => m.id);
    const fehlend = neuIds.filter(id => !gesehen.has(id));
    console.log("S6 · Rotation (Stufe 6, Niveau AP2) → " + zuege + " Züge · neue Minis gesehen: " + gesehen.size + "/" + neuIds.length);
    erwarte.gleich(zuege, 300, "300 Züge gelaufen");
    erwarte.gleich(fehlend, [], "diese neuen Minis kamen in 300 Zügen nicht vor");
    erwarte.gleich(gesehen.size, neuIds.length, "alle neuen Minis kamen vor");
  }));
});
