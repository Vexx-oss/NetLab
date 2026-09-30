"use strict";
/* ---------- Gerätebilder und Bedien-Symbole (eigene, flache Zeichnungen – keine Herstellersymbole) ----------
   UI.geraetebild(typ, skin)  → SVG-<g> um (0,0), ca. 52×52 (Internet: Wolke ~66×46), Farbe über --g
   UI.GERAETE                 → Liste der Geräteleiste: [{typ, skin, titel, text, taste}]
   UI.geraeteArt(typ, skin)   → Eintrag aus UI.GERAETE (Titel, Beschreibung)
   UI.symbol(name, groesse)   → kleines Strich-Symbol (<svg>) für Knöpfe, Dock, Menüs */
UI.GERAETE = [
  {typ: "pc",       skin: null,      titel: "PC",        text: "Arbeitsplatzrechner mit einer Netzwerkkarte (eth0)."},
  {typ: "pc",       skin: "laptop",  titel: "Laptop",    text: "Wie ein PC, nur mobil – eine Netzwerkkarte (eth0)."},
  {typ: "pc",       skin: "drucker", titel: "Drucker",   text: "Netzwerkdrucker. Technisch ein Host mit einer Adresse."},
  {typ: "pc",       skin: "kasse",   titel: "Kasse",     text: "Kassensystem. Technisch ein Host mit einer Adresse."},
  {typ: "pc",       skin: "tablet",  titel: "Tablet",    text: "Mobiles Gerät. Technisch ein Host mit einer Adresse."},
  {typ: "server",   skin: null,      titel: "Server",    text: "Bietet Dienste an: Web, DNS, DHCP, Dateien, SSH, Druck."},
  {typ: "nas",      skin: null,      titel: "NAS",       text: "Netzwerkspeicher mit zwei Anschlüssen (eth0, eth1)."},
  {typ: "switch",   skin: null,      titel: "Switch",    text: "Verbindet Geräte im selben Netz (Schicht 2). 24 × Fa, 2 × Gi, VLANs."},
  {typ: "router",   skin: null,      titel: "Router",    text: "Verbindet verschiedene Netze (Schicht 3). Gi0/0 bis Gi0/2, Routen, NAT, ACL."},
  {typ: "firewall", skin: null,      titel: "Firewall",  text: "Trennt Zonen (innen, außen, DMZ) und filtert nach Regeln."},
  {typ: "internet", skin: null,      titel: "Internet",  text: "Kulisse: der Provider und das Internet dahinter."},
];
UI.geraeteArt = (typ, skin) => UI.GERAETE.find(a => a.typ === typ && (a.skin || null) === (skin || null)) || UI.GERAETE.find(a => a.typ === typ) || {typ, titel: typ, text: ""};

UI.geraetebild = (() => {
  /* Glyphen im Feld -16..16, Strichstärke kommt aus CSS (.gb-glyph) */
  const G = {
    pc:       ["M-13 -12h26a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-26a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2z", "M0 6v5", "M-6 11h12", "M-9 -7h10"],
    laptop:   ["M-10 -11h20a1.5 1.5 0 0 1 1.5 1.5v13h-23v-13a1.5 1.5 0 0 1 1.5-1.5z", "M-16 5h32l-2.5 5h-27z", "M-6 -6h8"],
    drucker:  ["M-8 -4v-9h16v9", "M-14 -4h28a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-28a1.5 1.5 0 0 1-1.5-1.5v-10a1.5 1.5 0 0 1 1.5-1.5z", "M-8 4h16v10h-16z", "M-5 8h10", "M9 0h.01"],
    kasse:    ["M-9 -14h18a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5z", "M0 -3v4", "M-14 1h28a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-28a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z", "M-6 8h12", "M-5 -10h6"],
    tablet:   ["M-9 -15h18a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3h-18a3 3 0 0 1-3-3v-24a3 3 0 0 1 3-3z", "M-2 10h4"],
    server:   ["M-10 -15h20a2 2 0 0 1 2 2v26a2 2 0 0 1-2 2h-20a2 2 0 0 1-2-2v-26a2 2 0 0 1 2-2z", "M-7 -8h9", "M-7 -1h9", "M-7 6h9", "M6 -8h.01", "M6 -1h.01", "M6 6h.01"],
    nas:      ["M-13 -12h26a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3h-26a3 3 0 0 1-3-3v-18a3 3 0 0 1 3-3z", "M-9 -8h7v16h-7z", "M2 -8h7v16h-7z", "M-5.5 4h.01", "M5.5 4h.01"],
    switch:   ["M-15 -6h30a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-30a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z", "M-11 -1h3v2h-3z", "M-5 -1h3v2h-3z", "M1 -1h3v2h-3z", "M7 -1h3v2h-3z",
               "M-9 -12h16", "M4 -15l3 3-3 3", "M9 12h-16", "M-4 9l-3 3 3 3"],
    router:   ["M0 -14a14 14 0 1 1 0 28a14 14 0 1 1 0-28z", "M-9 0h7", "M-2 0l7-6", "M-2 0l7 6", "M2 -6h3v3", "M2 6h3v-3"],
    firewall: ["M0 -15l12 5v8c0 8-5.5 13-12 16c-6.5-3-12-8-12-16v-8z", "M-8 -3h16", "M-7 4h14", "M0 -10v7", "M-4 -3v7", "M4 -3v7", "M0 4v7"],
    internet: ["M-7 -2a7 7 0 0 1 14 0", "M-7 -2c0 5 3 8 7 8s7-3 7-8", "M0 -9v15", "M-7 -2h14"],
  };
  const WOLKE = "M-22 14h42a11 11 0 0 0 1-22a14 14 0 0 0-26-6a10 10 0 0 0-17 6a11 11 0 0 0 0 22z";
  const ART = {pc: "host", server: "server", nas: "nas", switch: "switch", router: "router", firewall: "firewall", internet: "internet"};
  return function geraetebild(typ, skin){
    const g = sv("g", {class: `gb gb-${ART[typ] || "host"}`});
    if (typ === "internet") {
      g.append(sv("path", {class: "gb-kachel", d: WOLKE}));
      const gl = sv("g", {class: "gb-glyph", transform: "translate(-1 2) scale(.9)"});
      for (const d of G.internet) gl.append(sv("path", {d}));
      g.append(gl);
      return g;
    }
    g.append(sv("rect", {class: "gb-kachel", x: -26, y: -26, width: 52, height: 52, rx: 13}));
    const gl = sv("g", {class: "gb-glyph"});
    for (const d of (G[skin] || G[typ] || G.pc)) gl.append(sv("path", {d}));
    g.append(gl);
    return g;
  };
})();

UI.symbol = (() => {
  /* 24er-Raster, Strich 1.8 */
  const S = {
    postfach:  ["M3 6h18v12H3z", "M3 7l9 6 9-6"],
    labor:     ["M5 6h5v5H5z", "M14 13h5v5h-5z", "M7.5 11v4.5h6.5", "M16.5 6v7"],
    kunden:    ["M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7z", "M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5", "M16 4.5a3.2 3.2 0 0 1 0 6.3", "M18 14.5c1.9.7 3 2.5 3.5 5.5"],
    wiki:      ["M4 5.5c2.7-1 5.3-1 8 .5v13c-2.7-1.5-5.3-1.5-8-.5z", "M20 5.5c-2.7-1-5.3-1-8 .5v13c2.7-1.5 5.3-1.5 8-.5z"],
    lernstand: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
    shop:      ["M4 8h16l-1.5 12h-13z", "M8.5 8a3.5 3.5 0 0 1 7 0"],
    leiste:    ["M3 5h18v5H3z", "M6 14h12", "M6 18h8"],
    sonne:     ["M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z", "M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"],
    mond:      ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],
    zahnrad:   ["M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3a1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
    hilfe:     ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7", "M12 17h.01"],
    zurueck:   ["M9 14L4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
    vor:       ["M15 14l5-5-5-5", "M20 9H9.5a5.5 5.5 0 0 0 0 11H13"],
    plus:      ["M12 5v14", "M5 12h14"],
    minus:     ["M5 12h14"],
    einpassen: ["M4 9V4h5", "M20 9V4h-5", "M4 15v5h5", "M20 15v5h-5"],
    aufraeumen:["M4 5h6v4H4z", "M14 5h6v4h-6z", "M9 15h6v4H9z", "M7 9v3h10V9", "M12 12v3"],
    zeiger:    ["M5 3l14 7-6 2-2 6z"],
    kabel:     ["M7 3v5", "M11 3v5", "M5 8h8v3a4 4 0 0 1-8 0z", "M9 15v2a4 4 0 0 0 4 4h6"],
    ping:      ["M4 12h3", "M17 12h3", "M12 12a2 2 0 1 0 0-.01", "M8.5 7.5a6 6 0 0 0 0 9", "M15.5 7.5a6 6 0 0 1 0 9"],
    konsole:   ["M3 5h18v14H3z", "M7 10l3 2-3 2", "M12 15h5"],
    strom:     ["M12 3v8", "M7 6.5a7 7 0 1 0 10 0"],
    neustart:  ["M20 12a8 8 0 1 1-2.3-5.7", "M20 4v5h-5"],
    loeschen:  ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13"],
    trennen:   ["M8 12H3", "M21 12h-5", "M9.5 8l5 8", "M14.5 8l-5 8"],
    schliessen:["M6 6l12 12", "M18 6L6 18"],
    oeffnen:   ["M14 4h6v6", "M20 4l-8 8", "M18 14v6H4V6h6"],
    suche:     ["M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z", "M16 16l4.5 4.5"],
    tastatur:  ["M3 6h18v12H3z", "M7 10h.01", "M11 10h.01", "M15 10h.01", "M7 14h10"],
    ebenen:    ["M12 4l9 5-9 5-9-5z", "M3 14l9 5 9-5"],
    sandbox:   ["M4 14h16l-2 6H6z", "M8 14c0-3 1.5-6 4-8c2.5 2 4 5 4 8"],
    pfeil:     ["M9 6l6 6-6 6"],
    pfeilLinks:["M15 6l-6 6 6 6"],
    pfeilOben: ["M6 15l6-6 6 6"],
    pfeilUnten:["M6 9l6 6 6-6"],
    warnung:   ["M12 4l9 16H3z", "M12 10v4", "M12 17h.01"],
    ok:        ["M5 12.5l4.5 4.5L19 7.5"],
    info:      ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 11v5", "M12 8h.01"],
    griff:     ["M9 6h.01", "M15 6h.01", "M9 12h.01", "M15 12h.01", "M9 18h.01", "M15 18h.01"],
    stern:     ["M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"],
    euro:      ["M18 6.5A7 7 0 1 0 18 17.5", "M4 10h10", "M4 14h9"],
    stufe:     ["M4 19h5v-5h5V9h5V4"],
    inspektor: ["M4 4h16v16H4z", "M14 4v16"],
    sim:       ["M4 4h16v16H4z", "M4 14h16"],
  };
  return function symbol(name, groesse = 20){
    const el = sv("svg", {viewBox: "0 0 24 24", width: groesse, height: groesse, class: "sym", "aria-hidden": "true", fill: "none",
      stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round"});
    for (const d of (S[name] || S.info)) el.append(sv("path", {d}));
    return el;
  };
})();
