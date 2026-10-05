"use strict";
/* ---------- Netzplan zum Auftrag: Darstellung (Plan – Ausbau 1.2, B2/B3; Architektur § 9.4, Präfix np-) ----------
   UI.netzplan.zeichnen(container, inst, {mappe})  Zeichnung (automatisch in Ebenen) oder Tabelle; im Dock darunter
                                                   „Plan ↔ Labor“ für das gewählte Gerät, Fuß: „Abweichungen markieren“
   UI.netzplan.anheften(inst)                      Reiter „Plan“ im Dock freigeben und zeigen (aus Mappe oder ⋯-Menü)
   Der Plan kommt aus Spiel.plan.fuer(inst) – also aus dem Soll-Netz, nie mit dem Fehler. Klick auf ein Plan-Gerät
   wählt es im Labor; ist der Reiter offen, bleibt er stehen (die Auswahl gehört dann zum Vergleich). */
UI.netzplan = (() => {
  const S = {ansicht: "zeichnung"};
  const ART = {netzplan: ["Netzplan", "So soll das Netz aussehen – die IT-Dokumentation."],
    skizze: ["Skizze vom Kunden", "So hat der Kunde es aufgemalt – Adressen stehen in der Tabelle."],
    tabelle: ["Adresstabelle", "Mit Lücken (?): Gateway und DNS leitest du selbst her."]};
  const HOST = {pc: true, server: true, nas: true};

  function zeichnen(c, inst, {mappe = false} = {}){
    if (!c || !inst) return;
    let plan;
    try { plan = Spiel.plan.fuer(inst, {breite: Math.max(240, (c.clientWidth || 400) - 30)}); } catch (e) { console.error("Netzplan", e); c.replaceChildren(h("p", {class: "np-leer"}, "Für diesen Auftrag gibt es keinen Plan.")); return; }
    const art = plan.art, ansicht = art === "tabelle" ? "tabelle" : S.ansicht;
    const wahl = (id, text) => h("button", {type: "button", class: ansicht === id ? "an" : "", "aria-pressed": String(ansicht === id),
      onclick: () => { S.ansicht = id; zeichnen(c, inst, {mappe}); }}, text);
    const kopf = h("div", {class: "np-kopf"},
      h("div", {class: "np-titel"}, ...(auditZiel(inst) ? [h("strong", {}, "Netzplan des Kunden"), h("small", {}, "Seine Dokumentation – ob sie stimmt, zeigt nur das Netz.")]
        : [h("strong", {}, ART[art][0]), h("small", {}, ART[art][1])])),
      art !== "tabelle" && !auditZiel(inst) ? h("div", {class: "np-wahl", role: "group", "aria-label": "Plan-Ansicht"}, wahl("zeichnung", "Zeichnung"), wahl("tabelle", "Tabelle")) : null);
    const auswahl = !mappe && UI.labor.netz === inst.netz ? UI.labor.auswahl?.geraet : null;
    const audit = auditZiel(inst);
    const inhalt = ansicht === "zeichnung" && !audit ? zeichnung(plan, art, auswahl) : tabelle(plan, auswahl, audit ? {inst, ziel: audit, c, mappe} : null);
    /* Ist ein Gerät gewählt, steht „Plan ↔ Labor“ oben – das ist der Vergleich, um den es geht */
    const teile = [kopf, auditZiel(inst) ? h("p", {class: "np-audit-hinweis"}, "Klick auf jeden Wert, der nicht zum Netz passt (✗). Noch ein Klick nimmt die Markierung zurück.") : null,
      !mappe && auswahl ? vergleich(inst, plan, auswahl) : null, h("div", {class: "np-flaeche"}, inhalt)].filter(Boolean);
    if (mappe) teile.push(h("div", {class: "np-fuss"}, h("button", {type: "button", class: "knopf", onclick: () => anheften(inst)}, "Neben das Labor heften ▸")));
    else {
      if (!auswahl) teile.push(h("p", {class: "np-hinweis"}, "Klick im Labor oder hier auf ein Gerät: Plan und Labor stehen dann nebeneinander."));
      const kostet = (inst.hilfeStufe || 0) < 4;
      teile.push(h("div", {class: "np-fuss"}, h("button", {type: "button", class: "knopf klein geist", title: "Zeigt, welche Geräte vom Plan abweichen – zählt wie die Hilfestufe „Bereich zeigen“",
        onclick: () => markieren(inst)}, "Abweichungen markieren", kostet ? h("small", {}, " −½ ★") : null)));
    }
    c.replaceChildren(h("div", {class: "np np-" + art}, ...teile));
  }

  /* SVG: Linien, dann Geräte mit Name und Adresszeilen (Schrift 15/14 px, gezeichnet in Plan-Einheiten) */
  function zeichnung(plan, art, auswahl){
    const pos = Object.fromEntries(plan.knoten.map(k => [k.id, k]));
    const svg = sv("svg", {class: "np-svg", viewBox: `0 0 ${plan.breite} ${plan.hoehe}`, role: "img", "aria-label": ART[art][0],
      style: `--np-b:${plan.breite}px`});
    if (art === "skizze") svg.append(sv("defs", {}, sv("filter", {id: "np-hand"},
      sv("feTurbulence", {type: "fractalNoise", baseFrequency: "0.025", numOctaves: "2", seed: "3", result: "rauschen"}),
      sv("feDisplacementMap", {in: "SourceGraphic", in2: "rauschen", scale: "3.2"}))));
    const linien = sv("g", {class: "np-linien", filter: art === "skizze" ? "url(#np-hand)" : null});
    for (const l of plan.linien) {
      const a = pos[l.a.id], b = pos[l.b.id]; if (!a || !b) continue;
      linien.append(sv("line", {class: "np-linie" + (l.trunk ? " trunk" : ""), x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        style: l.vlan && art === "netzplan" ? `stroke:var(--vlan-${((l.vlan - 1) % 8) + 1})` : null}));
      if (art === "netzplan") {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (l.trunk) linien.append(sv("text", {class: "np-port", x: mx + 6, y: my - 4, text: "Trunk"}));
        else if (l.vlan && l.vlan !== 1) linien.append(sv("text", {class: "np-port", x: mx + 6, y: my - 4, text: "VLAN " + l.vlan}));
      }
    }
    svg.append(linien);
    for (const k of plan.knoten) {
      const g = sv("g", {class: "np-geraet typ-" + k.typ + (k.id === auswahl ? " gewaehlt" : ""), transform: `translate(${k.x} ${k.y})`, "data-id": k.id, tabindex: "0",
        role: "button", "aria-label": k.name, onclick: () => waehlen(k.id), onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehlen(k.id); } }});
      g.append(sv("rect", {class: "np-ring", x: -30, y: -28, width: 60, height: 56, rx: 12}));
      const bild = UI.geraetebild(k.typ, k.skin); bild.setAttribute("transform", "scale(0.72)");
      if (art === "skizze") bild.setAttribute("filter", "url(#np-hand)");
      g.append(bild);
      g.append(sv("text", {class: "np-name", x: 0, y: 44, text: k.name}));
      k.zeigen.forEach((z, i) => g.append(sv("text", {class: "np-adresse", x: 0, y: 44 + 18 * (i + 1), text: z})));
      svg.append(g);
    }
    return svg;
  }

  /* Plan-Audit: das Arbeitsziel des Auftrags (oder null) */
  function auditZiel(inst){ const def = Spiel.defVon(inst); return def ? (def.ziele || []).find(z => z.typ === "audit") || null : null; }
  function tabelle(plan, auswahl, audit){
    const zelle = (w, kl = "") => h("td", {class: (w === "?" ? "np-luecke " : "") + kl}, w === "" || w == null ? "–" : String(w));
    /* Audit: Werte sind Knöpfe – markiert = „stimmt nicht“ */
    const pruef = (r, feld, w) => {
      if (!audit || w === "" || w == null || w === "?") return zelle(w, "mono");
      const key = `${r.id}.${r.port}.${feld}`, an = (audit.inst.audit || []).includes(key);
      return h("td", {class: "mono np-pruef" + (an ? " markiert" : "")}, h("button", {type: "button", class: "np-wert", "aria-pressed": String(an), title: an ? "Als falsch markiert – noch ein Klick nimmt es zurück" : "Als falsch markieren",
        onclick: e => { e.stopPropagation(); Spiel.audit.markieren(audit.inst, key); zeichnen(audit.c, audit.inst, {mappe: audit.mappe}); }}, an ? "✗ " + w : String(w)));
    };
    return h("table", {class: "np-tabelle" + (audit ? " np-audit" : "")},
      h("thead", {}, h("tr", {}, ["Gerät", "Anschluss", "IP-Adresse", "Maske", "Gateway", "DNS", "VLAN"].map(t => h("th", {}, t)))),
      h("tbody", {}, plan.tabelle.map(r => h("tr", {class: r.id === auswahl ? "gewaehlt" : "", onclick: () => waehlen(r.id)},
        h("th", {scope: "row"}, r.name), zelle(r.port, "mono"), pruef(r, "ip", r.ip), pruef(r, "maske", r.maske),
        HOST[r.typ] ? pruef(r, "gw", r.gw) : zelle("", "mono"), HOST[r.typ] ? pruef(r, "dns", r.dns) : zelle("", "mono"), zelle(r.vlan ?? "")))));
  }

  /* Plan ↔ Labor für das gewählte Gerät: nebeneinander, ohne zu sagen, was falsch ist – außer im Einstieg (R1) */
  function vergleich(inst, plan, id){
    const netz = UI.labor.netz, g = netz && netz.geraete[id];
    const soll = plan.tabelle.filter(r => r.id === id), name = g ? g.name : id;
    if (!g) return null;
    if (!plan.knoten.some(k => k.id === id)) return h("div", {class: "np-vergleich"}, h("strong", {}, name), h("p", {class: "np-hinweis"}, "Dieses Gerät steht nicht im Plan."));
    const ist = Spiel.plan.adressen(netz, g);
    const markieren = Spiel.niveauVon(inst) === "E";
    const felder = HOST[g.typ] ? [["ip", "IP"], ["maske", "Maske"], ["gw", "Gateway"], ["dns", "DNS"]] : [["ip", "IP"], ["maske", "Maske"]];
    const zeilen = [];
    const ports = [...new Set([...soll.map(r => r.port), ...ist.map(a => a.port)])];
    for (const port of ports) {
      const s = soll.find(r => r.port === port) || {}, i = ist.find(a => a.port === port) || {};
      if (ports.length > 1 || !HOST[g.typ]) zeilen.push(h("tr", {class: "np-port-zeile"}, h("th", {colspan: "3"}, port)));
      for (const [f, titel] of felder) {
        const sw = s.dhcp && f === "ip" ? "DHCP" : s[f] ?? "", iw = i.dhcp && f === "ip" ? "DHCP" : i[f] ?? "";
        if (!sw && !iw) continue;
        const anders = markieren && sw !== "?" && String(sw) !== String(iw);
        zeilen.push(h("tr", {class: anders ? "np-anders" : ""}, h("th", {scope: "row"}, titel), h("td", {class: "mono" + (sw === "?" ? " np-luecke" : "")}, sw || "–"), h("td", {class: "mono"}, iw || "–")));
      }
    }
    return h("div", {class: "np-vergleich"},
      h("div", {class: "np-vgl-kopf"}, h("strong", {}, name), h("small", {}, "Plan ↔ Labor")),
      h("table", {class: "np-vgl-tabelle"}, h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Plan"), h("th", {}, "Labor"))),
        h("tbody", {}, zeilen.length ? zeilen : h("tr", {}, h("td", {colspan: "3", class: "np-hinweis"}, "Keine Adressen – vergleiche Kabel und Ports in der Zeichnung.")))));
  }

  function waehlen(id){
    if (!UI.labor.netz?.geraete[id]) { UI.toast("Dieses Gerät gibt es im Labor (noch) nicht.", "info", {dauer: 2600}); return; }
    UI.labor.auswaehlen(id);
    UI.labor.hervorheben([{geraet: id}], 1600);
    neu();
  }
  function markieren(inst){
    while ((inst.hilfeStufe || 0) < 4 && Spiel.naechsteHilfe(inst)) Spiel.hilfe(inst);
    const ids = Spiel.plan.abweichungen(inst);
    UI.labor.auffrischen?.();
    UI.labor.auftragNeu();
    if (!ids.length) { UI.toast("Labor und Plan stimmen überein.", "ok", {dauer: 3000}); neu(); return; }
    UI.labor.hervorheben(ids.map(geraet => ({geraet})), 6000);
    UI.toast(`Weicht vom Plan ab: ${ids.map(id => UI.labor.netz.geraete[id]?.name || id).join(", ")}`, "info", {dauer: 5000});
    neu();
  }
  function anheften(inst){
    UI.labor.dockReiter("plan", true);
    UI.labor.dock("plan");
    UI.spiel.mappeZu?.();
    neu();
  }
  /* Reiter im Dock neu zeichnen, wenn er sichtbar ist */
  function neu(){
    const c = UI.labor.el?.plan, inst = UI.spiel?.inst;
    if (!c || c.hidden || !inst || UI.labor.netz !== inst.netz) return;
    zeichnen(c, inst);
  }
  for (const e of ["auswahl", "netz-geaendert", "dock"]) Bus.an(e, () => requestAnimationFrame(neu));

  return {zeichnen, anheften, markieren, neu, zeichnung};
})();
