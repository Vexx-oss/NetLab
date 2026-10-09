"use strict";
/* WIKI 2.0 (task-9): Pflichtfelder, Verweise, IPv6 und WLAN im Nachschlagewerk.
   Datenpaket: src/daten/wiki.js (DATEN.wiki[skillId]), Fertigkeiten: DATEN.skills (src/daten/basis.js).

   WARUM. Das Wiki ist die Nachschlage-Seite je Fertigkeit; die Oberfläche rendert genau `abschnitte`,
   `kurz`, `merksatz`, `pruefungstipp`, `quelle` und die `siehe`-Verweise (src/ui/karriere.js:293-315).
   Selbst gemessen am 09.10.2026 vor dem Nachtrag: 27 Seiten, 76 Abschnitte; fünf Seiten hatten nur
   zwei Abschnitte, die vier dünnsten davon waren alle AP2 (lab.stp 607 Zeichen, lab.storage 630,
   lab.fw 923, lab.ttl 932, dazu lab.dns 1011). Ein ganzes Prüfungsgebiet kam nicht vor: IPv6 hatte
   im ganzen Quelltext 0 Treffer, WLAN/Access Point nur Erzähltext. Nach dem Nachtrag: 27 Seiten,
   95 Abschnitte, dünnste Seite 749 Zeichen.

   Geprüft wird hier die FORM, nicht die Fachlichkeit: Pflichtfelder, keine leeren Seiten, eindeutige
   Abschnittstitel, schlichtes HTML, kein toter `siehe`-Verweis, und dass IPv6- sowie WLAN-Abschnitte
   mit Beleg vorhanden sind. Ob die Texte fachlich stimmen, ist Handarbeit (Bericht zu task-9) und
   steht in keiner Zusicherung; ob die Oberfläche sie schön rendert, prüft tools/rauch.py.

   NICHT doppelt geprüft: dass die `stichwort`-Einträge der Mini-Denkhilfen auf ihrer Wiki-Seite
   fehlen – das ist die Zusicherung in tests/spiel-mini-denktexte.test.js. */
gruppe("Wiki 2.0: Pflichtfelder, Verweise, IPv6 und WLAN", () => {
  /* Nur die Felder, die die Datenform vorschreibt (Kopfkommentar src/daten/wiki.js:3). */
  const PFLICHT = ["titel", "kurz", "abschnitte", "merksatz", "pruefungstipp", "quelle", "belege", "siehe"];
  /* Erlaubte Tags laut Kopfkommentar, dazu die bereits im Bestand benutzten <sup>/<sub>/<ol>/<br>. */
  const TAGS = new Set(["p", "ul", "ol", "li", "code", "b", "strong", "i", "em", "table", "tr", "th", "td", "pre", "sup", "sub", "br"]);
  const seiten = () => Object.entries(DATEN.wiki || {});
  const skillIds = () => (DATEN.skills || []).map(s => s.id);
  /* Zusatzseiten ohne eigene Fertigkeit (Leitung, 09.10.2026: „Klassenraum“, „Übergabe“). Die Liste
     steht in den DATEN (`DATEN.wikiZusatz`) – EINE Quelle der Wahrheit, die auch die Ansicht liest.
     Ausdrücklich gelistet (kein „irgendwas, was keine Fertigkeit ist“): so bleibt ein Tippfehler in
     einer skill-id laut und wird nicht still zur Zusatzseite. */
  const ZUSATZ = (typeof DATEN !== "undefined" && Array.isArray(DATEN.wikiZusatz)) ? DATEN.wikiZusatz.slice() : ["klassenraum", "uebergabe"];
  /* Sichtbarer Text = alles, was UI.karriere.wikiAnsicht zeigt (ohne `belege`, `siehe`). */
  const sichtbar = w => [w.titel, w.kurz, w.merksatz, w.pruefungstipp, w.quelle,
    ...(w.abschnitte || []).map(a => (a.titel || "") + " " + (a.html || ""))].filter(Boolean).join(" ");
  const abschnitt = (id, re) => (((DATEN.wiki || {})[id] || {}).abschnitte || [])
    .find(a => re.test((a.titel || "") + " " + (a.html || "")));

  pruefe('Jede Seite trägt die acht Pflichtfelder, gefüllt und vom richtigen Typ', () => {
    const fehler = [];
    for (const [id, w] of seiten()) {
      if (!w || typeof w !== "object") { fehler.push(`${id}: kein Objekt`); continue; }
      for (const f of PFLICHT) {
        if (!Object.prototype.hasOwnProperty.call(w, f)) { fehler.push(`${id}: ${f} fehlt`); continue; }
        const v = w[f];
        if (f === "abschnitte" || f === "siehe") {
          if (!Array.isArray(v) || v.length === 0) fehler.push(`${id}: ${f} ist keine gefüllte Liste`);
        } else if (typeof v !== "string" || !v.trim()) fehler.push(`${id}: ${f} ist leer`);
      }
    }
    erwarte.gleich(fehler, []);
    /* Eine Seite je Fertigkeit (27) PLUS die ausdrücklich gelisteten Zusatzseiten – der Klassenraum
       ist keine Fertigkeit, braucht aber eine Nachschlage-Seite. */
    erwarte.gleich(skillIds().filter(id => !(DATEN.wiki || {})[id]), [], "Fertigkeiten ohne Wiki-Seite");
    erwarte.gleich(seiten().map(([id]) => id).filter(id => !skillIds().includes(id)), ZUSATZ, "Zusatzseiten ohne eigene Fertigkeit");
    erwarte.gleich(seiten().length, skillIds().length + ZUSATZ.length, "Seitenzahl (Fertigkeiten + Zusatzseiten)");
  });

  pruefe('Keine Seite zeigt ins Leere: jede Seiten-ID ist eine Fertigkeit oder eine Zusatzseite', () => {
    const bekannt = new Set(skillIds()), fremd = [];
    for (const [id] of seiten()) if (!bekannt.has(id) && !ZUSATZ.includes(id)) fremd.push(id);
    erwarte.gleich(fremd, [], "Wiki-Seiten ohne Fertigkeit und ohne Eintrag in ZUSATZ");
    const fehlend = skillIds().filter(id => !(DATEN.wiki || {})[id]);
    erwarte.gleich(fehlend, [], "Fertigkeiten ohne Wiki-Seite");
  });

  pruefe('Jede Seite hat Inhalt: die dünnste bleibt über der gemessenen Untergrenze', () => {
    const leer = [], duenn = [];
    for (const [id, w] of seiten()) {
      const n = sichtbar(w).length;
      if (n < 200) leer.push(`${id}: ${n} Zeichen`);
      /* Vor dem Nachtrag lag die dünnste Seite bei 607 Zeichen (lab.stp, zwei Abschnitte);
         nach dem Nachtrag bei 749 (lab.dmz). 600 hält den Nachtrag fest, ohne zu kleben. */
      else if (n < 600) duenn.push(`${id}: ${n} Zeichen`);
    }
    erwarte.gleich(leer, [], "Seiten ohne Inhalt");
    erwarte.gleich(duenn, [], "Seiten unter 600 Zeichen (dünner als der gemessene Bestand)");
  });

  pruefe('Jeder Abschnitt hat Titel und Text, die Titel sind je Seite eindeutig', () => {
    const fehler = [], doppelt = [];
    for (const [id, w] of seiten()) {
      const gesehen = new Set();
      for (const [i, a] of (w.abschnitte || []).entries()) {
        if (!a || typeof a !== "object") { fehler.push(`${id}[${i}]: kein Objekt`); continue; }
        if (typeof a.titel !== "string" || a.titel.trim().length < 3) fehler.push(`${id}[${i}]: Titel fehlt`);
        if (typeof a.html !== "string" || a.html.trim().length < 40) fehler.push(`${id}[${i}]: Text zu knapp`);
        if (gesehen.has(a.titel)) doppelt.push(`${id}: „${a.titel}“ zweimal`);
        gesehen.add(a.titel);
      }
    }
    erwarte.gleich(fehler, []);
    erwarte.gleich(doppelt, []);
  });

  pruefe('Das HTML bleibt schlicht: nur erlaubte Tags, keine Attribute, kein Skript', () => {
    const fehler = [];
    for (const [id, w] of seiten()) {
      for (const a of w.abschnitte || []) {
        const html = String((a && a.html) || "");
        const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
        let m;
        while ((m = re.exec(html)) !== null) {
          const tag = m[1].toLowerCase(), rest = m[2];
          if (!TAGS.has(tag)) fehler.push(`${id} / ${a.titel}: Tag <${tag}>`);
          if (rest.trim()) fehler.push(`${id} / ${a.titel}: <${tag}${rest}> trägt ein Attribut`);
        }
        if (/<script|<style|javascript:|on[a-z]+\s*=/i.test(html)) fehler.push(`${id} / ${a.titel}: Skript oder Attribut im Text`);
      }
    }
    erwarte.gleich(fehler, []);
  });

  pruefe('Kein siehe-Verweis zeigt ins Leere – jede ID hat Fertigkeit und Seite', () => {
    const bekannt = new Set(skillIds()), fehler = [];
    for (const [id, w] of seiten()) {
      for (const z of w.siehe || []) {
        if (!bekannt.has(z)) fehler.push(`${id} → ${z}: keine Fertigkeit`);
        else if (!(DATEN.wiki || {})[z]) fehler.push(`${id} → ${z}: keine Wiki-Seite`);
        if (z === id) fehler.push(`${id} → sich selbst`);
      }
    }
    erwarte.gleich(fehler, []);
  });

  pruefe('IPv6 ist nachgetragen: fünf Seiten mit eigenem Abschnitt, die AP1-Kernseiten gefüllt', () => {
    const mit = seiten().filter(([id]) => abschnitt(id, /IPv6/)).map(([id]) => id);
    erwarte.wahr(mit.length >= 5, `nur ${mit.length} Seiten mit IPv6-Abschnitt: ${mit.join(", ")}`);
    const fehler = [];
    for (const pflicht of ["lab.ip", "lab.subnetz", "lab.arp", "lab.dhcp"]) {
      const a = abschnitt(pflicht, /IPv6/);
      if (!a) fehler.push(`${pflicht}: kein IPv6-Abschnitt`);
      else if ((a.titel + a.html).length < 400) fehler.push(`${pflicht}: IPv6-Abschnitt zu knapp (${(a.titel + a.html).length} Zeichen)`);
    }
    erwarte.gleich(fehler, []);
  });

  pruefe('WLAN und Access Point sind nachgetragen: Link, SSID/VLAN und Sicherheit', () => {
    const fehler = [];
    const link = abschnitt("lab.link", /WLAN/);
    if (!link) fehler.push("lab.link: kein WLAN-Abschnitt");
    else if (!/Access Point/.test(link.titel + link.html)) fehler.push("lab.link: der Access Point fehlt im Text");
    const vlan = abschnitt("lab.vlan", /SSID/);
    if (!vlan) fehler.push("lab.vlan: kein Abschnitt zu SSID und VLAN");
    else if (!/Trunk/.test(vlan.html)) fehler.push("lab.vlan: der Trunk zum Access Point fehlt");
    const mit = seiten().filter(([id]) => abschnitt(id, /WLAN/)).map(([id]) => id);
    erwarte.wahr(mit.length >= 2, `nur ${mit.length} Seiten nennen WLAN: ${mit.join(", ")}`);
    erwarte.gleich(fehler, []);
  });

  pruefe('IPv6- und WLAN-Abschnitte nennen ihre Belege in belege', () => {
    const fehler = [];
    for (const [id, w] of seiten()) {
      const belege = String(w.belege || "");
      if (abschnitt(id, /IPv6/) && !/RFC \d/.test(belege)) fehler.push(`${id}: IPv6-Abschnitt, aber kein RFC in belege`);
      if (abschnitt(id, /WLAN/) && !/IEEE|BSI|Wi-Fi/.test(belege)) fehler.push(`${id}: WLAN-Abschnitt, aber kein IEEE/BSI/Wi-Fi-Beleg`);
    }
    erwarte.gleich(fehler, []);
  });

  /* ---------- Rezepte gegen die echte CLI (task-25) ----------
     Ein Wiki-Rezept (<pre> mit Prompt) ist eine Anleitung zum Abtippen: Jede Zeile muss die CLI des
     passenden Geräts annehmen – ODER der Abschnitt sagt ausdrücklich, dass es echtes Gerät ist
     („Echtes IOS …", „das Labor kennt …"). Ohne diesen Wächter zeigte die Wiki am 09.10.2026 zwölf
     Zeilen, die ein Azubi abtippt und dann scheitert (spanning-tree, switchport nonegotiate, ipv6 …).
     Geprüft wird zeilenweise in EINER Sitzung je Block, also so, wie das Rezept abgetippt wird –
     sonst schlüge `encapsulation dot1Q` vor `ip address` fälschlich fehl. */
  pruefe('Jede Rezeptzeile mit Prompt läuft in der CLI – oder der Abschnitt nennt sie echtes Gerät', () => {
    const ARTEN = {switch: "sw1", router: "r1", "host-windows": "pc1", "host-linux": "srv1"};
    const SYNTAX = /Invalid input|Incomplete command|Ambiguous command|Unrecognized command|command not found|falsch geschrieben|Folgender Befehl wurde nicht gefunden/i;
    const MARKER = /echt\w*\s+(IOS|Windows|Gerät\w*|Hardware|System\w*)|Labor kennt|kennt dieses Kommando nicht/i;
    const EBENEN = {user: 0, priv: 1, config: 2, if: 3, subif: 3, range: 3, vlan: 3, line: 3, std: 3, ext: 3, dhcp: 3};
    const modusAus = (token, term) => {
      if (/\(config-if-range\)/.test(token)) return "range";
      if (/\(config-subif\)/.test(token)) return "subif";
      if (/\(config-if\)/.test(token)) return "if";
      if (/\(config-vlan\)/.test(token)) return "vlan";
      if (/\(config-line\)/.test(token)) return "line";
      if (/\(config-ext-nacl\)/.test(token)) return "ext";
      if (/\(dhcp-config\)/.test(token)) return "dhcp";
      if (/\(config\)/.test(token)) return "config";
      return term === "#" ? "priv" : "user";
    };
    const netzBauen = () => {
      const n = Modell.neu();
      Modell.geraet(n, "router", {id: "r1", name: "R1"});
      Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
      Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
      Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
      return n;
    };
    /* Sitzung auf den Modus bringen, den der Prompt zeigt: erst nach oben (exit), dann hinunter. */
    const inModus = (s, typ, modus) => {
      const tiefe = m => (EBENEN[m] == null ? 0 : EBENEN[m]);
      const ziel = tiefe(modus);
      let schutz = 0;
      while (s.modus !== modus && s.modus !== "user" && tiefe(s.modus) >= ziel && schutz++ < 8) CLI.eingabe(s, "exit");
      if (s.modus === modus) return true;
      if (s.modus === "user" && ziel >= 1) CLI.eingabe(s, "enable");
      if (s.modus === "priv" && ziel >= 2) CLI.eingabe(s, "configure terminal");
      if (s.modus === "config" && ziel >= 3) {
        if (modus === "if") CLI.eingabe(s, typ === "switch" ? "interface Fa0/1" : "interface Gi0/1");
        else if (modus === "subif") CLI.eingabe(s, "interface Gi0/1.10");
        else if (modus === "range") CLI.eingabe(s, "interface range fa0/1 - 2");
        else if (modus === "vlan") CLI.eingabe(s, "vlan 10");
        else if (modus === "line") CLI.eingabe(s, "line console 0");
        else if (modus === "ext") CLI.eingabe(s, "ip access-list extended GAST");
        else if (modus === "dhcp") CLI.eingabe(s, "ip dhcp pool LAN");
      }
      return s.modus === modus;
    };
    const fehler = [];
    let zeilen = 0;
    for (const [id, w] of seiten()) {
      for (const a of w.abschnitte || []) {
        const html = String(a.html || "");
        const re = /<pre>([\s\S]*?)<\/pre>/g;
        let m;
        while ((m = re.exec(html)) !== null) {
          let sitzung = null, art = null;
          for (const roh of m[1].split("\n")) {
            const t = /^([^\s]+?)([>#])\s*(\S.*)$/.exec(roh.trim());
            if (!t) continue;
            const token = t[1], befehl = t[3];
            const windows = /:\\/.test(token);
            const typ = windows ? "host-windows" : (/^SW/i.test(token) ? "switch" : (/^R\d/i.test(token) ? "router" : null));
            if (!typ) { fehler.push(`${id} / ${a.titel}: unbekannter Prompt „${token}“ (${roh.trim()})`); continue; }
            if (!sitzung || typ !== art) { art = typ; sitzung = CLI.sitzung(netzBauen(), ARTEN[typ]); }
            const modus = modusAus(token, t[2]);
            if (!windows && !inModus(sitzung, typ, modus)) { fehler.push(`${id} / ${a.titel}: Modus „${modus}“ nicht erreichbar (${roh.trim()})`); continue; }
            /* Offene Rückfrage zuerst mit Enter beantworten – so, wie es das Rezept sagt („← Enter").
               Sonst schluckt die Rückfrage die nächste Zeile und der Fehler läge beim Prüfstand. */
            if (sitzung.rueckfrage) CLI.eingabe(sitzung, "");
            const r = CLI.eingabe(sitzung, befehl);
            zeilen++;
            const aus = String((r && r.ausgabe) || "");
            if ((SYNTAX.test(aus) || (!windows && r && r.fehler)) && !MARKER.test(html))
              fehler.push(`${id} / ${a.titel}: „${roh.trim()}“ lehnt die CLI ab und der Abschnitt kennzeichnet es nicht als echtes Gerät`);
          }
        }
      }
    }
    erwarte.gleich(fehler, []);
    erwarte.wahr(zeilen >= 60, `Rezeptzeilen geprüft: ${zeilen}`);
  });
});
