"use strict";
/* ---------- Gerätebilder und Bedien-Symbole (eigene, flache Zeichnungen – keine Herstellersymbole) ----------
   UI.geraetebild(typ, skin)  → SVG-<g> um (0,0), ca. 52×52 (Internet: Wolke ~66×46), Farbe über --g
   UI.GERAETE                 → alle Geräte: [{typ, skin, titel, kurz, text, kategorie}] (Reihenfolge = Reihenfolge im Fach)
   UI.KATEGORIEN              → Fächer der Geräteleiste: [{id, titel, kurz, typ, skin, taste, text}] (Taste 1–4 öffnet das Fach)
   UI.geraeteArt(typ, skin)   → Eintrag aus UI.GERAETE (Titel, Beschreibung)
   UI.symbol(name, groesse)   → kleines Strich-Symbol (<svg>) für Knöpfe, Dock, Menüs */
UI.GERAETE = [
  {typ: "pc",       skin: null,      kategorie: "endgeraete", titel: "PC",       kurz: "Arbeitsplatz, eine Netzwerkkarte", text: "Arbeitsplatzrechner mit einer Netzwerkkarte (eth0)."},
  {typ: "pc",       skin: "laptop",  kategorie: "endgeraete", titel: "Laptop",   kurz: "wie ein PC, nur mobil",            text: "Wie ein PC, nur mobil – eine Netzwerkkarte (eth0)."},
  {typ: "pc",       skin: "tablet",  kategorie: "endgeraete", titel: "Tablet",   kurz: "mobiles Gerät",                    text: "Mobiles Gerät. Technisch ein Host mit einer Adresse."},
  {typ: "pc",       skin: "kasse",   kategorie: "endgeraete", titel: "Kasse",    kurz: "Kassensystem",                     text: "Kassensystem. Technisch ein Host mit einer Adresse."},
  {typ: "pc",       skin: "drucker", kategorie: "endgeraete", titel: "Drucker",  kurz: "Netzwerkdrucker",                  text: "Netzwerkdrucker. Technisch ein Host mit einer Adresse."},
  {typ: "server",   skin: null,      kategorie: "server",     titel: "Server",   kurz: "Web, DNS, DHCP, Dateien",          text: "Bietet Dienste an: Web, DNS, DHCP, Dateien, SSH, Druck."},
  {typ: "nas",      skin: null,      kategorie: "server",     titel: "NAS",      kurz: "Speicher, zwei Anschlüsse",        text: "Netzwerkspeicher mit zwei Anschlüssen (eth0, eth1)."},
  {typ: "switch",   skin: null,      kategorie: "netzwerk",   titel: "Switch",   kurz: "ein Netz, Schicht 2, VLANs",       text: "Verbindet Geräte im selben Netz (Schicht 2). 24 × Fa, 2 × Gi, VLANs."},
  {typ: "router",   skin: null,      kategorie: "netzwerk",   titel: "Router",   kurz: "zwischen Netzen, Schicht 3",       text: "Verbindet verschiedene Netze (Schicht 3). Gi0/0 bis Gi0/2, Routen, NAT, ACL."},
  {typ: "firewall", skin: null,      kategorie: "netzwerk",   titel: "Firewall", kurz: "Zonen und Regeln",                 text: "Trennt Zonen (innen, außen, DMZ) und filtert nach Regeln."},
  {typ: "internet", skin: null,      kategorie: "aussen",     titel: "Internet", kurz: "Provider und alles dahinter",      text: "Kulisse: der Provider und das Internet dahinter."},
];
/* Später dazu: Drahtlos (Access Point), Zubehör (Kabeltester) – ein Eintrag hier und die Geräte mit dieser kategorie */
UI.KATEGORIEN = [
  {id: "endgeraete", titel: "Endgeräte",         kurz: "Endgeräte", typ: "pc",       skin: null, taste: "1", text: "PC, Laptop, Tablet, Kasse, Drucker"},
  {id: "server",     titel: "Server & Speicher", kurz: "Server",    typ: "server",   skin: null, taste: "2", text: "Server, NAS"},
  {id: "netzwerk",   titel: "Netzwerk",          kurz: "Netzwerk",  typ: "switch",   skin: null, taste: "3", text: "Switch, Router, Firewall"},
  {id: "aussen",     titel: "Außenwelt",         kurz: "Außenwelt", typ: "internet", skin: null, taste: "4", text: "Internet (Provider)"},
];
UI.geraeteArt = (typ, skin) => UI.GERAETE.find(a => a.typ === typ && (a.skin || null) === (skin || null)) || UI.GERAETE.find(a => a.typ === typ) || {typ, titel: typ, text: ""};

UI.GERAETEREIHE = {
  raster: 24,
  stand: 20.5,
  strich: { klein: 2, gross: 2.5 },
  formen: {
    internet: { name: "Internet", rolle: "Außenwelt · Provider",
      pfade: ["M6.6 18.5h10.8A3.4 3.4 0 0 0 18 12.2 4.2 4.2 0 0 0 13.2 8 3.4 3.4 0 0 0 8.4 10.2 4.3 4.3 0 0 0 6.6 18.5Z"],
      tupfer: [] },
    router: { name: "Router", rolle: "zwischen Netzen · Schicht 3",
      pfade: ["M6 12.5h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z", "M7.2 12.5V5.6", "M16.8 12.5V9.6l-3.2-3.4"],
      tupfer: [],
      porten: [[7.4, 16.6, 2.2, 2, 0.35], [11, 16.6, 2.2, 2, 0.35]] },
    firewall: { name: "Firewall", rolle: "Zonen und Regeln",
      pfade: ["M5.6 20.5a1.6 1.6 0 0 1-1.6-1.6V13.5h3.4V10.5h2.9v3h3.4v-3h2.9v3H20v5.4a1.6 1.6 0 0 1-1.6 1.6z", "M4 17h16", "M9.2 17v3.5", "M14.8 17v3.5", "M12 13.5v3.5"],
      tupfer: [] },
    switch: { name: "Switch", rolle: "ein Netz · Schicht 2",
      pfade: ["M6 12.5h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z"],
      tupfer: [],
      porten: [[5.4, 16.6, 2.2, 2, 0.35], [8.8, 16.6, 2.2, 2, 0.35], [12.2, 16.6, 2.2, 2, 0.35], [15.6, 16.6, 2.2, 2, 0.35]] },
    server: { name: "Server", rolle: "Dienste · SSH, DNS, DHCP",
      pfade: ["M8 2.5h8a2 2 0 0 1 2 2v13.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2z", "M6 6.4h12"],
      tupfer: [],
      porten: [[8.4, 8.8, 5.2, 2, 0.5], [8.4, 12.8, 5.2, 2, 0.5], [8.4, 16.8, 5.2, 2, 0.5]] },
    nas: { name: "NAS", rolle: "Speicher · zwei Anschlüsse",
      pfade: ["M6 4.5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2z"],
      tupfer: [[17.2, 7, 0.9]],
      porten: [[7, 9.8, 10, 3.2, 2.3], [7, 14.8, 10, 3.2, 2.3]] },
    pc: { name: "PC", rolle: "Arbeitsplatz · eine Karte",
      pfade: ["M6 4.5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z", "M10.2 15.5h3.6l.8 5", "M7.4 20.5h9.2", "M7.8 9h5.4", "M7.8 11.8h3.2"],
      tupfer: [] },
    laptop: { name: "Laptop", rolle: "wie ein PC, nur mobil",
      pfade: ["M6.5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v9.5h-14V6a1.5 1.5 0 0 1 1.5-1.5z", "M5 15.5h14l1.5 5H3.5z", "M8 11.5h5"],
      tupfer: [] },
    tablet: { name: "Tablet", rolle: "mobiles Gerät",
      pfade: ["M9 2.5h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2z", "M10.2 17.2h3.6"],
      tupfer: [[12, 5.7, 0.95]] },
    kasse: { name: "Kasse", rolle: "Kassensystem",
      pfade: ["M7.5 3.5h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z", "M12 12.5v2.5", "M5.5 15h13a2 2 0 0 1 2 2v1.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V17a2 2 0 0 1 2-2z", "M10 18.2h4", "M8 6.4h3.4", "M8 9h6"],
      tupfer: [] },
    drucker: { name: "Drucker", rolle: "Netzwerkdrucker",
      pfade: ["M8.4 8V5.2A1.6 1.6 0 0 1 10 3.6h4A1.6 1.6 0 0 1 15.6 5.2V8", "M6 8h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z", "M8.4 17v3.5h7.2V17", "M9.8 11.8h4.4"],
      tupfer: [[16.9, 9.8, 0.95]] },
  }
};

/* UI.geraetebild(typ, skin, {px}) — Strichzeichnung aus EINEM Raster (24), keine Platte, keine Karte.
   px = gewuenschte Anzeigegroesse in Pixeln (Strich 2,1 px bis 32, sonst 2,5 px). Ohne px: altes
   Nominalmass 52 (zentriert), damit bestehende Aufrufer unveraendert funktionieren. */
UI.geraetebild = (() => {
  const ART = {pc: "host", server: "server", nas: "nas", switch: "switch", router: "router", firewall: "firewall", internet: "internet"};
  return function geraetebild(typ, skin, opt){
    const form = UI.GERAETEREIHE.formen[skin] || UI.GERAETEREIHE.formen[typ] || UI.GERAETEREIHE.formen.pc;
    const g = sv("g", {class: "gb gb-" + (ART[typ] || "host")});
    const px = opt && +opt.px || 0;
    const gl = sv("g", {class: "gb-glyph", fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round"});
    if (px) {
      gl.setAttribute("transform", `translate(${(-px / 2).toFixed(2)} ${(-px / 2).toFixed(2)}) scale(${(px / 24).toFixed(4)})`);
      gl.setAttribute("stroke-width", ((px >= 34 ? 2.5 : 2.1) * 24 / px).toFixed(2));
    } else {
      gl.setAttribute("transform", `translate(-26 -26) scale(${(52 / 24).toFixed(4)})`);
      gl.setAttribute("stroke-width", (2.2 * 24 / 52).toFixed(2));
    }
    for (const d of form.pfade) gl.append(sv("path", {d}));
    for (const t of form.tupfer) gl.append(sv("circle", {class: "gb-tupfer", cx: t[0], cy: t[1], r: t[2]}));
    for (const t of form.porten || []) gl.append(sv("rect", {class: "gb-tupfer", x: t[0], y: t[1], width: t[2], height: t[3], rx: t[4] || 0}));
    g.append(gl);
    return g;
  };
})();

UI.symbol = (() => {
  /* 24er-Raster, Strich 1.8 */
  const S = {
    postfach:  ["M3 6h18v12H3z", "M3 7l9 6 9-6"],
    heute:     ["M4 6h16v14H4z", "M4 10h16", "M8.5 3.5v4", "M15.5 3.5v4", "M8 13.5h3.5V17H8z"],
    labor:     ["M5 6h5v5H5z", "M14 13h5v5h-5z", "M7.5 11v4.5h6.5", "M16.5 6v7"],
    kunden:    ["M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7z", "M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5", "M16 4.5a3.2 3.2 0 0 1 0 6.3", "M18 14.5c1.9.7 3 2.5 3.5 5.5"],
    wiki:      ["M4 5.5c2.7-1 5.3-1 8 .5v13c-2.7-1.5-5.3-1.5-8-.5z", "M20 5.5c-2.7-1-5.3-1-8 .5v13c2.7-1.5 5.3-1.5 8-.5z"],
    lernstand: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
    lernen:    ["M12 4l8 4-8 4-8-4z", "M7 10.8V15c0 1.5 2.2 2.7 5 2.7s5-1.2 5-2.7v-4.2"],
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
    mappe:     ["M9 3.5h6v3H9z", "M15 5h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3", "M8.5 11h7", "M8.5 15h5"],
    sim:       ["M4 4h16v16H4z", "M4 14h16"],
    plan:      ["M4 5h5v4H4z", "M15 5h5v4h-5z", "M9.5 17h5v3h-5z", "M6.5 9v3.5h11V9", "M12 12.5V17"],
    akte:      ["M5 3.5h10l4 4V20.5H5z", "M15 3.5v4h4", "M8.5 12h7", "M8.5 15.5h7", "M8.5 8.5h3"],
    /* ---- U01 (UX-Audit): die Glyphen, die vorher Emoji waren. Ein Satz, eine Strichstärke (1.8), currentColor. ---- */
    terminal:  ["M3 5h18v14H3z", "M7 10l3 2-3 2", "M12 15h5"],
    feierabend:["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],
    empfehlung:["M4 5h16v11H9l-5 4z"],
    trace:     ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 8l3 8-3-2-3 2z"],
    kaffee:    ["M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z", "M16 10h2.5a2.5 2.5 0 0 1 0 5H16", "M7 4v2", "M11 4v2"],
    raetsel:   ["M4 4h6v2a2 2 0 1 0 4 0V4h6v6h-2a2 2 0 1 0 0 4h2v6h-6v-2a2 2 0 1 0-4 0v2H4v-6h2a2 2 0 1 0 0-4H4z"],
    dex:       ["M4 5.5c2.7-1 5.3-1 8 .5v13c-2.7-1.5-5.3-1.5-8-.5z", "M20 5.5c-2.7-1-5.3-1-8 .5v13c2.7-1.5 5.3-1.5 8-.5z"],
    ziel:      ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z", "M12 12h.01"],
    feier:     ["M4 20l4-11 7 7z", "M14 4v3", "M20 10h-3", "M18 4l-2 2"],
    trophae:   ["M8 4h8v3a4 4 0 0 1-8 0z", "M8 5H5v2a3 3 0 0 0 3 3", "M16 5h3v2a3 3 0 0 1-3 3", "M12 11v4", "M10 15h4v4h-4z"],
    schloss:   ["M7 11V8a5 5 0 0 1 10 0v3", "M5 11h14v9H5z", "M12 15v2"],
    sprechblase:["M4 5h16v11H9l-5 4z"],
    provisorium:["M5.5 14.5l9-9a3.5 3.5 0 0 1 4.5 4.5l-9 9a3.5 3.5 0 0 1-4.5-4.5z", "M9 11h6", "M9 13.5h6"],
    urkunde:   ["M6 3h12v13H6z", "M9 7h6", "M9 10h6", "M12 16v2", "M9 21l3-3 3 3z"],
    auswertung:["M9 4h6v3H9z", "M9 5H6v16h12V5h-3", "M9 11h6", "M9 15h6"],
    idee:      ["M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z", "M10 20h4"],
    anker:     ["M9 3h6l-1 6 3 3H7l3-3z", "M12 12v9"],
    medaille:  ["M8 3l4 6 4-6", "M12 9a5 5 0 1 0 0 10a5 5 0 1 0 0-10z"],
    tendenz:   ["M4 19V5", "M4 19h16", "M7 15l4-4 3 3 5-6", "M15 8h4v4"],
    telefon:   ["M6 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z"],
    werkzeug:  ["M16 3a4 4 0 0 0-3.5 5.5L4 17l3 3 8.5-8.5A4 4 0 0 0 21 8l-3 3-2-2 3-3a4 4 0 0 0-3-3z"],
    senior:    ["M12 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7z", "M4.5 21c.8-4 3.7-6 7.5-6s6.7 2 7.5 6"],
    test:      ["M9 3h6", "M10 3v7l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 10V3", "M7.5 16h9"],
    beleg:     ["M6 3h12v18l-3-2-3 2-3-2-3 2z", "M9 8h6", "M9 12h6", "M9 16h4"],
    welt:      ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M3 12h18", "M12 3c-3.5 5-3.5 13 0 18", "M12 3c3.5 5 3.5 13 0 18"],
    etikett:   ["M4 4h8l8 8-8 8-8-8z", "M8 8h.01"],
    sicherung: ["M5 4h12l3 3v13H5z", "M8 4v5h8V4", "M8 20v-6h8v6"],
    rechner:   ["M5 3h14v18H5z", "M8 7h8", "M8 12h8", "M8 16h8"],
    serie:     ["M12 3c3 4 4.5 6.5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2.5-5 .3 1.5 1 2.5 2 2.5C13 8 12.5 5.5 12 3z"],
    blitz:     ["M13 3L5 14h6l-1 7 8-11h-6z"],
    subnetz:   ["M4 5h7v4H4z", "M13 5h7v4h-7z", "M4 10h7v4H4z", "M13 10h7v4h-7z", "M4 15h7v4H4z", "M13 15h7v4h-7z"],
  };
  return function symbol(name, groesse = 20){
    const el = sv("svg", {viewBox: "0 0 24 24", width: groesse, height: groesse, class: "sym", "aria-hidden": "true", fill: "none",
      stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round"});
    for (const d of (S[name] || S.info)) el.append(sv("path", {d}));
    return el;
  };
})();