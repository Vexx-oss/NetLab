"use strict";
/* ---------- Zentraler Resolver „Fehler → Ziel" (Runde 4, Strang C) ----------
   EIN Ort für alle Sprünge ins Netz: das Simulations-Panel („Zum Fundort"), die Einsatzakte
   (Strang A, UI.fehlerziel.springen) und der Inspektor (Strang D) rufen denselben Resolver.
   Er rechnet nichts nach und erfindet kein Ziel – er liest die vorhandene Auswahl- und
   Ansichts-API des Labors und bewegt sie zum Fundort.

   ÖFFENTLICHE, STABILE FLÄCHE (nur diese Funktionen aufrufen):
     UI.fehlerziel.springen(ziel)            → {ok, schritte, grund, ort}   (wirft NIE)
     UI.fehlerziel.zielAusEreignis(ereignis) → ziel | null                  (Trace-Ereignis, Architektur § 5.2)
     UI.fehlerziel.kabelEnden(kabel)         → {a, b} | null                (Kabel-Objekt ODER Kabel-Id)
     UI.fehlerziel.ortText(ziel)             → „PC-Kasse eth0" | ""          (nur Anzeige)
     UI.fehlerziel.istProblem(ereignis)      → boolean                      (echte Fehler-/Warnmeldung)

   ziel = {
     art:      „geraet" | „port" | „kabel" | „frame" | „ebene" | „zone"  (Pflicht;
                fehlt sie, wird sie aus geraet/port/kabel erraten)
     geraet:   Geräte-Id                    (art geraet/port; bei frame optional)
     port:     Portname (String)            (art port; optional)
     kabel:    {a:{geraet,port}, b:{geraet,port}} ODER Kabel-Id (String)   (art kabel)
     frame:    Trace-Ereignis               (art frame; Gerät/Port kommen aus dem Ereignis)
     ebene:    Ebenen-Id aus UI.ebenen.LISTE („physik"|„vlan"|„ip"|„mac"|„routen")
     werkzeug: Werkzeug-Id („kabel"|„ping"|„auswahl"); nur gesetzt, wenn der Aufrufer es will
     dock:     Reiter des Docks (Standard „inspektor")
     leise:    true = kein Puls-Highlight (z. B. beim Wiederherstellen einer Ansicht)
     ms:       Dauer des Highlights in ms (Standard: 1800 bei „voll", 600 bei „reduziert", 0 bei „aus")
     zentrieren: false = nicht einpassen/zentrieren (Standard: true)
   }

   BEDIENREGELN: jede Station läuft nur, wenn die Funktion existiert, jede in try/catch –
   der Resolver wirft nie. KEIN FOKUSKLAU: er ruft kein focus(). „Bewegung aus" und
   prefers-reduced-motion werden respektiert (UI.bewegung). Esc-Verhalten ändert er nicht. */
UI.fehlerziel = (() => {
  const labor = () => { try { return UI.labor || null; } catch (e) { return null; } };
  const app = () => { try { return UI.app || null; } catch (e) { return null; } };
  const ebenen = () => { try { return UI.ebenen || null; } catch (e) { return null; } };
  function netz(){
    const l = labor();
    try { return (l && l.netz) || null; } catch (e) { return null; }
  }
  function bewegung(){
    try { return typeof UI.bewegung === "function" ? UI.bewegung() : "voll"; } catch (e) { return "voll"; }
  }
  /* Dauer des Highlights: „Bewegung aus" markiert nur die Auswahl, „reduziert" kurz. */
  function dauer(ziel){
    if (ziel && ziel.ms != null && isFinite(+ziel.ms)) return Math.max(0, +ziel.ms);
    const b = bewegung();
    return b === "voll" ? 1800 : b === "reduziert" ? 600 : 0;
  }
  const geraetName = (n, id) => {
    const g = n && n.geraete ? n.geraete[id] : null;
    return g ? String(g.name || id) : (id ? String(id) : "");
  };
  function portListe(n, id){
    try { if (typeof Modell !== "undefined" && Modell.ports && n.geraete[id]) return Modell.ports(n.geraete[id]); } catch (e) { /* nur Anzeige */ }
    return [];
  }

  /* Ein Trace-Ereignis (Architektur § 5.2) → Sprungziel. Ohne Gerät gibt es kein Ziel (ehrlich null). */
  function zielAusEreignis(e){
    if (!e || typeof e !== "object") return null;
    const z = {art: e.frame ? "frame" : e.port ? "port" : "geraet"};
    if (typeof e.geraet === "string" && e.geraet) z.geraet = e.geraet;
    if (typeof e.port === "string" && e.port) z.port = e.port;
    if (e.nach && typeof e.nach === "object" && e.nach.geraet) z.nach = {geraet: e.nach.geraet, port: e.nach.port || null};
    if (!z.geraet) return null;
    return z;
  }
  /* Kabel-Objekt oder Kabel-Id → die zwei Enden {a:{geraet,port}, b:{…}}; unbekannt → null. */
  function kabelEnden(k){
    const n = netz();
    let ka = k;
    if (typeof k === "string") ka = n && Array.isArray(n.kabel) ? n.kabel.find(x => x && x.id === k) : null;
    if (!ka || !ka.a || !ka.b) return null;
    return {a: {geraet: ka.a.geraet, port: ka.a.port || null}, b: {geraet: ka.b.geraet, port: ka.b.port || null}};
  }
  /* Echte Fehler-/Warnmeldung? (verwerfen mit Grund, ICMP-Fehlermeldung) */
  function istProblem(e){
    if (!e || typeof e !== "object") return false;
    if (e.art === "verwerfen" && e.grund) return true;
    const c = e.frame && e.frame.icmp;
    if (c && (c.typ === "unreachable" || c.typ === "time-exceeded")) return true;
    return false;
  }
  /* Kurzer Ortsname für Anzeige/Buttons – nur aus echten Daten. */
  function ortText(ziel){
    const n = netz();
    if (!n || !ziel || typeof ziel !== "object") return "";
    if (ziel.art === "kabel" || ziel.kabel) {
      const e = kabelEnden(ziel.kabel);
      if (e) return (geraetName(n, e.a.geraet) + " " + (e.a.port || "") + " ↔ " + geraetName(n, e.b.geraet) + " " + (e.b.port || "")).replace(/\s+/g, " ").trim();
    }
    if (ziel.art === "ebene") return "Ansicht wechseln";
    const id = ziel.geraet;
    if (!id) return "";
    const name = geraetName(n, id);
    return ziel.port ? name + " " + ziel.port : name;
  }

  function springen(ziel){
    const r = {ok: false, schritte: [], grund: null, ort: ""};
    const schritt = s => r.schritte.push(s);
    if (!ziel || typeof ziel !== "object") { r.grund = "Kein Ziel übergeben."; return r; }
    const l = labor(), n = netz();
    if (!l || typeof l.auswaehlen !== "function" || !n || !n.geraete) {
      r.grund = "Das Labor ist nicht geladen – hier gibt es keinen Fundort zum Anspringen.";
      return r;
    }
    const art = String(ziel.art || (ziel.kabel ? "kabel" : ziel.port ? "port" : ziel.geraet ? "geraet" : ""));
    if (!art) { r.grund = "Ziel ohne Art."; return r; }

    /* Ansicht: das Labor öffnen, falls gerade eine andere Ansicht steht (ohne neue Ansicht zu bauen).
       Erst NACH der Zielprüfung – ein unbekanntes Ziel darf die Ansicht nicht umschalten. */
    function oeffneLabor(){
      const a = app();
      if (a && typeof a.ansicht === "function") {
        try { if (a.aktuell && a.aktuell !== "labor") { a.ansicht("labor"); schritt("labor-geoeffnet"); } } catch (e) { /* Ansicht bleibt */ }
      }
    }
    /* 1 · Ebene (nur wenn ausdrücklich genannt). */
    if (ziel.ebene && ebenen() && typeof ebenen().setzen === "function") {
      try { ebenen().setzen(String(ziel.ebene)); schritt("ebene:" + ziel.ebene); } catch (e) { /* Ansicht bleibt */ }
    }
    if (art === "ebene") {
      if (!ziel.ebene) { r.grund = "Ebene ohne Namen."; return r; }
      if (!ebenen() || typeof ebenen().setzen !== "function") { r.grund = "Die Ansicht lässt sich hier nicht wechseln."; return r; }
      r.ok = true; r.ort = "Ansicht wechseln"; return r;
    }
    /* 2 · Ziel auflösen – defensiv, nie mit erfundenem Gerät. */
    let geraet = null, port = null, kabel = null;
    if (art === "frame") {
      const quelle = (ziel.frame && typeof ziel.frame === "object") ? ziel.frame : ziel;
      const ausFrame = zielAusEreignis(quelle);
      if (ausFrame) { geraet = ausFrame.geraet; port = ausFrame.port || null; }
      if (!geraet && typeof ziel.geraet === "string") geraet = ziel.geraet;
    } else if (art === "kabel") {
      const e = kabelEnden(ziel.kabel);
      if (!e || !n.geraete[e.a.geraet] || !n.geraete[e.b.geraet]) { r.grund = "Dieses Kabel gibt es in diesem Netz nicht (mehr)."; return r; }
      kabel = typeof ziel.kabel === "string" ? ziel.kabel
        : (n.kabel.find(x => x && x.a && x.b && x.a.geraet === e.a.geraet && x.b.geraet === e.b.geraet && x.a.port === e.a.port && x.b.port === e.b.port) || {}).id || null;
      geraet = e.a.geraet; port = e.a.port;
    } else {
      geraet = typeof ziel.geraet === "string" ? ziel.geraet : null;
      port = typeof ziel.port === "string" ? ziel.port : null;
    }
    if (art === "zone") {
      /* Zone: kein Gerät, nur der Bereich – der Inspektor zeigt die Zone (Strang D). */
      const cidr = String(ziel.cidr || ziel.zone || "");
      if (!cidr) { r.grund = "Zone ohne CIDR."; return r; }
      oeffneLabor();
      if (typeof l.zeigeZone === "function") { try { l.zeigeZone(cidr); schritt("zone:" + cidr); } catch (e) { /* Anzeige */ } }
      if (typeof l.dock === "function") { try { l.dock(ziel.dock || "inspektor"); schritt("dock"); } catch (e) { /* Dock */ } }
      r.ok = true; r.ort = cidr; return r;
    }
    if (!geraet) { r.grund = "Dieses Ereignis nennt kein Gerät – es gibt keinen Fundort."; return r; }
    if (!n.geraete[geraet]) { r.grund = "Das Gerät " + geraet + " gibt es in diesem Netz nicht."; return r; }
    if (port && portListe(n, geraet).length && !portListe(n, geraet).includes(port)) {
      r.grund = "Am Gerät " + geraetName(n, geraet) + " gibt es keinen Port " + port + ".";
      port = null;
    }
    r.ort = ortText({geraet, port, kabel: kabel || ziel.kabel});
    oeffneLabor();
    /* 3 · Kabel zeigen (Inspektor-Ansicht „Kabel"), wenn eines genannt ist. */
    if (kabel && typeof l.zeigeKabel === "function") { try { l.zeigeKabel(kabel); schritt("kabel:" + kabel); } catch (e) { /* Anzeige */ } }
    /* 4 · Zentrieren: auf schmalen Fenstern liegt das Gerät sonst außerhalb des Blicks.
       (zentrieren wählt in editor.js das Gerät ohne Port – darum kommt die Auswahl danach, einmal, mit Port.) */
    if (ziel.zentrieren !== false && typeof l.zentrieren === "function" && !kabel) {
      try { l.zentrieren(geraet); schritt("zentriert"); } catch (e) { /* Ansicht bleibt */ }
    }
    /* 5 · Auswählen – ohne den Werkzeugmodus zu wechseln (der Aufrufer entscheidet über ziel.werkzeug). */
    try { l.auswaehlen(geraet, port || undefined); schritt("auswahl:" + geraet + (port ? ":" + port : "")); }
    catch (e) { r.grund = "Die Auswahl ließ sich nicht setzen."; return r; }
    if (ziel.werkzeug) {
      try { if (typeof l.werkzeug === "function") { l.werkzeug(String(ziel.werkzeug)); schritt("werkzeug:" + ziel.werkzeug); } } catch (e) { /* Werkzeug bleibt */ }
    }
    /* 6 · Inspektor zeigen (bzw. den gewünschten Dock-Reiter). */
    if (typeof l.dock === "function") {
      try { l.dock(ziel.dock || "inspektor"); schritt("dock:" + (ziel.dock || "inspektor")); } catch (e) { /* Dock */ }
    }
    /* 7 · Hervorheben (Puls) – nur wenn Bewegung erlaubt; kein Fokusklau. */
    if (ziel.leise !== true && typeof l.hervorheben === "function") {
      const ms = dauer(ziel);
      if (ms > 0) {
        const e = kabel ? kabelEnden(kabel || ziel.kabel) : null;
        const liste = e ? [{geraet: e.a.geraet, port: e.a.port}, {geraet: e.b.geraet, port: e.b.port}] : [{geraet, port: port || null}];
        try { l.hervorheben(liste, ms); schritt("hervorgehoben"); } catch (x) { /* Anzeige */ }
      }
    }
    r.ok = true;
    return r;
  }

  return {springen, zielAusEreignis, kabelEnden, ortText, istProblem};
})();
