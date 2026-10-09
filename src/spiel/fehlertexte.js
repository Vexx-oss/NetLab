"use strict";
/* ---------- Spiel: Fehlertexte – jede Konsolen-Ausgabe in Klartext, je Bildungsstand ----------
   Auftrag „Hilfestellung", Baustein E. Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md
     § 2  Die vier Stufen (azubi · azubi-plus · geselle · meister) – die Tiefe kommt aus Spiel.stufe.text(a, k, n)
     § 4  Formen: {titel, muster, beispiel} wie Spiel.hilfe.syntaxBruecke, Daten-Idiom wie DATEN.hilfen.VORSCHLAEGE
     § 7  Diese Datei gehört Baustein E – niemand sonst schreibt hier hinein.

   Die Tabelle selbst liegt seit task-23 (Befund F) im Datenpaket `src/daten/fehlertexte.js`
   (`DATEN.fehlertexte`, 82 Einträge). Hier steht nur der Auswerter: Lage bestimmen, Eintrag wählen,
   Text der Stufe holen. `Spiel.FEHLERTEXTE` bleibt als öffentliche Fläche erhalten – als Verweis
   auf das Datenpaket, nicht als Kopie (eine Quelle).

   Öffentliche Fläche (nur diese aufrufen):
     Spiel.FEHLERTEXTE   die Tabelle (Verweis auf DATEN.fehlertexte; Reihenfolge = Vorrang)
     Spiel.fehlertext({netz, id, modus, art, eingabe, ausgabe, fehler}) -> {titel, text, muster, beispiel} | null

   Aufbau eines Tabelleneintrags (Datenpaket):
     id        stabil, Präfix nach Bereich (ios-…, win-…, lin-…, curl-…, alle-…)
     titel     kurze Überschrift für die Fläche (eindeutig – der Test prüft das)
     art       ["ios"|"fw"|"host-windows"|"host-linux"|"alle"]; leer = überall
     modus     CLI-Modi (§ 4: user, priv, config, if, vlan, line, dhcp, dhcpHost, fwUser, fwPriv …); leer = alle
     eingabe   zusätzliches Muster gegen die EINGABEZEILE, wenn die Ausgabe allein mehrdeutig ist
     erkennung Muster gegen die AUSGABE der Konsole
     nurFehler true = nur bei gesetztem Fehlerkennzeichen (Auffang-Eintrag)
     text      {ausfuehrlich, knapp, nurcodes} – genau diese drei an Spiel.stufe.text(…) übergeben
     muster    das richtige Muster zum Lernen (mit <Platzhaltern>)
     beispiel  ein abtippbares Beispiel; Zeichenkette oder Funktion(lage) -> Zeichenkette
     quelle    wo die Meldung im Quelltext steht (Beleg, kein Schmuck)
     probe     echter Text, der diesen Eintrag auslöst · probeEingabe: passende Eingabezeile dazu

   Regeln: kein DOM, kein Math.random, kein Date.now. Fehlt Baustein A (Spiel.stufe), gilt „ausfuehrlich" –
   der Aufruf ist defensiv, kein Wurf. Kein Aufruf wirft bei unbekanntem art/modus oder fehlendem netz. */

(() => {

  /* ---------- Die Tabelle: Verweis auf das Datenpaket (task-23, F) ----------
     Fehlt das Paket (kaputter Bau), bleibt die Fläche leer statt zu werfen – kein stiller Wurf. */
  Spiel.FEHLERTEXTE = (typeof DATEN !== "undefined" && DATEN && Array.isArray(DATEN.fehlertexte)) ? DATEN.fehlertexte : [];

  /* ---------- Kleine Helfer: nur hier innen, öffentlich ist allein Spiel.fehlertext ---------- */

  /* Ein Port, den es auf diesem Gerätetyp wirklich gibt – Beispiele sollen abtippbar sein.
     Das Ergebnis geht als `lage.port` an die Beispiele im Datenpaket (dort steht keine Gerätekunde).
     Ausgeschrieben (Fa0/1 -> FastEthernet0/1), weil IOS beide Formen annimmt und der lange Name
     für den Azubi lesbarer ist; `Modell.PORTS.kurzLang` hat Vorrang, falls das Modell ihn führt. */
  function beispielPort(typ){
    try {
      const liste = (typeof Modell !== "undefined" && Modell.PORTS && Modell.PORTS[typ]) || [];
      const wunsch = typ === "switch" ? "Fa" : "Gi";
      const kurz = liste.find(p => p.startsWith(wunsch)) || liste[0] || "Gi0/0";
      if (typeof Modell !== "undefined" && Modell.PORTS && Modell.PORTS.kurzLang && Modell.PORTS.kurzLang[kurz]) return Modell.PORTS.kurzLang[kurz];
      const namen = {Fa: "FastEthernet", Gi: "GigabitEthernet", Te: "TenGigabitEthernet", Et: "Ethernet"};
      return kurz.replace(/^([A-Za-z]+)/, (m, p) => namen[p] || m);
    } catch (e) { return "GigabitEthernet0/0"; }
  }

  /* ---------- Die Lage: was der Aufrufer mitteilt, plus was aus netz/id ableitbar ist ---------- */

  const ART_ALIAS = {
    ios: "ios", router: "ios", switch: "ios", fw: "fw", firewall: "fw",
    host: "host", windows: "host-windows", win: "host-windows", cmd: "host-windows",
    powershell: "host-windows", linux: "host-linux", bash: "host-linux", shell: "host-linux",
  };
  /* Die Flächen, die die Tabelle kennt. „host" ist die Sitzung von parser.js (art() liefert ios|host|fw|info);
     „host-windows"/„host-linux" ist dieselbe Fläche, wenn das Betriebssystem feststeht. */
  const ARTE = ["ios", "fw", "host", "host-windows", "host-linux", "info"];

  function lageVon(o){
    const lage = {art: null, modus: null, typ: null, os: null, name: "", port: null};
    /* Ein unbekannter Bereich ist KEINE Information (defensiv, Vertrag § 3 Regel 1): dann wird nicht
       gefiltert und der Auffang bleibt zuständig – lieber eine allgemeine als gar keine Erklärung. */
    if (o.art) { const a = ART_ALIAS[String(o.art).toLowerCase()] || String(o.art).toLowerCase(); lage.art = ARTE.includes(a) ? a : null; }
    if (o.modus) lage.modus = String(o.modus).toLowerCase();
    const g = o.netz && o.id && o.netz.geraete ? o.netz.geraete[o.id] : null;
    if (g) {
      lage.typ = g.typ || null;
      lage.name = (g.running && g.running.hostname) || g.name || String(o.id);
      try {
        if (typeof Modell !== "undefined" && Modell.osVon) lage.os = Modell.osVon(g);
        if (!lage.art) {
          if (Modell.HOST && Modell.HOST[g.typ]) lage.art = lage.os ? "host-" + lage.os : "host";
          else if (g.typ === "firewall") lage.art = "fw";
          else if (Modell.IOS && Modell.IOS[g.typ]) lage.art = "ios";
        }
        /* Aus "host" und dem Betriebssystem wird die genaue Fläche – dann passen auch die Beispiele. */
        if (lage.art === "host" && lage.os) lage.art = "host-" + lage.os;
        lage.port = beispielPort(g.typ);
      } catch (e) { /* Modell fehlt (Testkapsel): art bleibt, was der Aufrufer gesagt hat */ }
    }
    return lage;
  }

  /* Art des Eintrags — STRENG, wenn der Bereich des Geräts bekannt ist.
     Vertrag § 4 („passt zu Gerät und Modus"): die Windows-Meldung darf einem Linux-Gerät nicht erklärt
     werden. Gemessen 07.10.2026: `fehlertext({netz, id:"srv1"})` lieferte „Diesen Befehl kennt die
     Eingabeaufforderung nicht" für einen Server, weil ein Eintrag ohne Bereich als „passt überall" galt.
     Regeln:
       · Eintrag ohne Bereich (`[]`)  → passt auf jedes Gerät (so steht es in § 4 für „egal").
       · Eintrag mit `["alle"]`       → ausdrücklicher Joker (Vertrag § 4, Feld `geraet`), nur der Auffang.
       · `"host"` und `"host-<os>"`   → beides meint dieselbe Fläche, solange das Betriebssystem nicht feststeht.
       · Ist der Bereich des Geräts bekannt, gewinnt NUR ein passender Eintrag; sonst bleibt es bei „null"
         statt bei einer fremden Erklärung. */
  function artPasst(t, art){
    if (!t.art || !t.art.length) return true;
    if (t.art.includes("alle")) return true;
    if (!art) return true;
    return t.art.some(x => x === art || (art === "host" && x.startsWith("host")) || (art.startsWith("host") && x === art));
  }
  /* Der Auffang (art: ["alle"]) passt nach artPasst auf jedes Gerät; dass er nur antworten darf, solange
     der Bereich NICHT feststeht, prüft die Auswahlschleife über `nachbereich` – dort steht auch der Grund. */
  function modusPasst(t, modus){
    if (!t.modus || !t.modus.length || !modus) return true;
    return t.modus.includes(modus);
  }

  /* Text der Stufe: aus Spiel.stufe.text(a, k, n). Fehlt Baustein A, gilt „ausfuehrlich" (Vertrag § 2, defensiv). */
  function stufenText(t, lage, ausgabe){
    const q = t.text || {};
    const hol = w => { const x = typeof w === "function" ? w(lage, ausgabe) : w; return x == null ? "" : String(x); };
    try {
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.text === "function") {
        const r = Spiel.stufe.text(hol(q.ausfuehrlich), hol(q.knapp), hol(q.nurcodes));
        if (typeof r === "string" && r.trim()) return r;
      }
    } catch (e) { /* nie werfen: im Zweifel der ausführliche Text */ }
    return hol(q.ausfuehrlich);
  }

  /* ---------- Die öffentliche Funktion ---------- */

  /* Spiel.fehlertext({netz, id, modus, art, eingabe, ausgabe, fehler}) -> {titel, text, muster, beispiel} | null
     `fehler` darf true/false sein ODER das ganze Ergebnis der Konsole ({ausgabe, fehler, tipp, …}) – dann
     wird `ausgabe` von dort geholt und `fehler` aus dessen Kennzeichen. Leere Ausgabe ohne Fehler -> null. */
  Spiel.fehlertext = function(o){
    o = o && typeof o === "object" ? o : {};
    const ausObjekt = o.fehler && typeof o.fehler === "object" ? o.fehler : null;
    const ausgabe = String(o.ausgabe != null ? o.ausgabe : (ausObjekt && ausObjekt.ausgabe != null ? ausObjekt.ausgabe : ""));
    const eingabe = String(o.eingabe != null ? o.eingabe : "").trim();
    const fehler = ausObjekt ? !!ausObjekt.fehler : !!o.fehler;
    if (!ausgabe.trim() && !fehler) return null;              /* nichts zu erklären */
    const lage = lageVon(o);
    /* Der Auffang darf nur antworten, wenn der Bereich des Geräts NICHT feststeht. Steht er fest, bekommt
       der Spieler lieber gar keinen Kasten als eine Erklärung, die zu einem anderen Terminal gehört. */
    const auffang = Spiel.FEHLERTEXTE.find(t => (t.art || []).includes("alle")) || null;
    const nachbereich = t => !auffang || t.id !== auffang.id || !lage.art;
    for (const t of Spiel.FEHLERTEXTE) {
      if (!nachbereich(t)) continue;
      if (t.nurFehler && !fehler) continue;
      if (!artPasst(t, lage.art) || !modusPasst(t, lage.modus)) continue;
      if (t.eingabe && !t.eingabe.test(eingabe)) continue;
      if (!t.erkennung.test(ausgabe)) continue;
      const beispiel = typeof t.beispiel === "function" ? t.beispiel(lage) : t.beispiel;
      return {titel: t.titel, text: stufenText(t, lage, ausgabe), muster: String(t.muster), beispiel: String(beispiel)};
    }
    return null;
  };

})();
