"use strict";
/* ---------- Inhalt: Korrektheit (2.1 S2, F1–F7) ----------
   Warum diese Datei: Der A-Bericht (F1–F9) hat fünf Widersprüche zwischen Lehre und Labor gefunden,
   die kein Test abdeckte – die Texte waren grün, weil niemand sie gegen die echte CLI/Sim hielt.
   Diese Datei schließt die Lücke und hält sie zu:
     a) JEDER in src/daten/hilfen.js angebotene Befehl existiert JE GERÄTEART in der passenden Quelle
        (ios-befehle.js für IOS und Firewall, host-windows.js, host-linux.js) – Quellprüfung über die
        echten Befehlsbäume (CLI.baeumeBauen) bzw. _namen der Host-Terminals, dazu ein echter CLI-Lauf
        auf einem Gerät dieser Art (ein Befehl, der nur im falschen Baum steht, fällt so auf).
     b) Jede in einem Lehrtext genannte Handlung existiert im Modell/CLI ODER ist ausdrücklich als
        „nur echtes Gerät“ markiert; zusätzlich: zitierte Befehle müssen die CLI kennen.
     c) Der TTL-Startwert je Betriebssystem stimmt mit src/sim/l3.js überein (Architektur § 16.3:
        Windows 128, Linux 64) – und zwar messbar über Ping und im Quelltext (kein TTL-Literal außerhalb
        der Tabelle). Traceroute: Windows-Endgeräte ICMP, Linux-Endgeräte UDP-Proben.
     d) Jede „das Labor kann/kennt X nicht“-Aussage im Wiki ist durch eine Messung gedeckt. Die
        Gegenprobe läuft über ALLE Labor-Sätze: ein neuer, unbelegter Satz macht den Test rot.
     e) Lehrtext-Abdeckung: 27/27 oder eine benannte Ausnahme je fehlender Fertigkeit.
   Belegt wird Wirkung, nicht Grün: Wiki und Lehrtexte sind DATEN, die echte CLI und die echte
   Simulation sind die Gegenprobe. */
(() => {
  const fs = require("fs"), path = require("path");
  const WURZEL = path.resolve(__dirname, "..");
  const quelle = rel => fs.readFileSync(path.join(WURZEL, rel), "utf8");

  /* Ein Befund ist kein Syntaxfehler – nur echte „diesen Befehl kenne ich nicht“-Antworten zählen. */
  const UNBEKANNT = /(% )?(Invalid input|Incomplete command|Ambiguous command|Unrecognized command|Unbekannter Befehl)|Folgender Befehl wurde nicht gefunden|command not found|falsch geschrieben/i;

  /* ---------- Netze und Sitzungen für die Gerätearten ---------- */
  function netzMitAllen(){
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
    Modell.geraet(n, "firewall", {id: "fw1", name: "FW1"});
    return n;
  }
  function netzFuerKlasse(klasse){
    const n = netzMitAllen();
    const id = klasse === "fw" ? "fw1" : klasse === "host-windows" ? "pc1" : klasse === "host-linux" ? "srv1" : "r1";
    return {n, id};
  }
  const IOS_MODI = ["user", "priv", "config", "if", "subif", "range", "vlan", "line", "std", "ext", "dhcp"];
  const BAUM_VON = {user: "exec", priv: "exec", config: "config", if: "if", subif: "if", range: "if", vlan: "vlan",
                    line: "line", std: "std", ext: "ext", dhcp: "dhcp", fwUser: "fw", fwPriv: "fw"};
  /* Welche Gerätearten kann ein Vorschlag laut geraet/modus überhaupt treffen? */
  function klassenVon(v){
    if (v.geraet !== "alle") return [v.geraet];
    const klassen = [];
    for (const m of v.modus || []) {
      if (IOS_MODI.includes(m)) { if (!klassen.includes("ios")) klassen.push("ios"); }
      else if (m === "host" || m === "") { for (const k of ["host-windows", "host-linux"]) if (!klassen.includes(k)) klassen.push(k); }
      else if (String(m).startsWith("fw")) { if (!klassen.includes("fw")) klassen.push("fw"); }
    }
    return klassen.length ? klassen : ["ios"];
  }
  function modusFuerKlasse(v, klasse){
    if (klasse === "fw") return (v.modus || []).includes("fwPriv") ? "fwPriv" : "fwUser";
    if (klasse === "ios") return (v.modus || []).find(m => IOS_MODI.includes(m)) || "priv";
    return "host";
  }
  function sitzungIn(n, id, modus){
    const s = CLI.sitzung(n, id), g = n.geraete[id];
    if (["priv", "config", "if", "subif", "range", "vlan", "fwPriv"].includes(modus)) CLI.eingabe(s, "enable");
    if (["config", "if", "subif", "range", "vlan"].includes(modus)) CLI.eingabe(s, "configure terminal");
    if (modus === "if") CLI.eingabe(s, g.typ === "switch" ? "interface Fa0/1" : "interface Gi0/1");
    if (modus === "subif") CLI.eingabe(s, "interface Gi0/1.10");
    if (modus === "range") CLI.eingabe(s, "interface range fa0/1 - 2");
    if (modus === "vlan") CLI.eingabe(s, "vlan 10");
    return s;
  }

  /* ---------- Quellprüfung: Befehlsbäume der echten CLI ---------- */
  function istArgument(teil){
    return /^(\d|")/.test(teil) || teil.includes(".") || teil.startsWith("<") || teil === "network";
  }
  function baumPfad(baumName, befehl){
    const teile = String(befehl).trim().split(/\s+/);
    let knoten = ((CLI.baeumeBauen()[baumName] || {}).k) || [], getroffen = 0;
    for (const teil of teile) {
      if (istArgument(teil)) break;
      const kind = knoten.find(x => x && typeof x.w === "string" && x.w.toLowerCase() === teil.toLowerCase());
      if (!kind) break;
      getroffen++;
      const k = typeof kind.k === "function" ? kind.k() : kind.k;
      knoten = Array.isArray(k) ? k : [];
    }
    const erwartet = Math.max(1, teile.findIndex(istArgument) < 0 ? teile.length : teile.findIndex(istArgument));
    return {getroffen, erwartet};
  }
  function alleBefehlswoerter(){
    const woerter = new Set(), gesehen = new Set();
    const lauf = (knoten, tiefe) => {
      if (tiefe > 12) return;                     /* „no …“-Knoten zeigen auf ihren eigenen Baum – Tiefe begrenzt */
      for (const k of knoten || []) {
        if (!k || gesehen.has(k)) continue;
        gesehen.add(k);
        if (typeof k.w === "string") woerter.add(k.w.toLowerCase());
        let kinder = k.k;
        if (typeof kinder === "function") { try { kinder = k.k(); } catch (e) { kinder = null; } }   /* manche Kinderlisten brauchen eine Sitzung */
        if (Array.isArray(kinder)) lauf(kinder, tiefe + 1);
      }
    };
    for (const name of Object.keys(CLI.baeumeBauen())) lauf((CLI.baeumeBauen()[name] || {}).k, 0);
    return woerter;
  }

  gruppe("Inhalt: Korrektheit (F1–F7)", () => {
    /* ================= a) Befehle je Geräteart ================= */
    pruefe("F1/a: jeder Hilfen-Befehl steht in der Quelle SEINER Geräteart (IOS, Firewall, Windows, Linux)", () => {
      const fehler = [], alle = DATEN.hilfen.VORSCHLAEGE;
      erwarte.wahr(alle.length >= 40, "geprüft werden " + alle.length + " Vorschläge");
      for (const v of alle) {
        for (const klasse of klassenVon(v)) {
          if (klasse === "ios" || klasse === "fw") {
            const baum = BAUM_VON[modusFuerKlasse(v, klasse)] || "exec";
            const {getroffen, erwartet} = baumPfad(baum, v.befehl);
            if (getroffen < erwartet) fehler.push(v.id + " (" + v.geraet + "): „" + v.befehl + "“ fehlt in ios-befehle.js, Baum " + baum + " (nur " + getroffen + "/" + erwartet + " Wörter)");
          } else {
            const namen = CLI.HOST_BEFEHLE[klasse === "host-windows" ? "windows" : "linux"]._namen({});
            const kopf = String(v.befehl).trim().split(/\s+/)[0].toLowerCase();
            if (!namen.map(x => String(x).toLowerCase()).includes(kopf))
              fehler.push(v.id + " (" + klasse + "): „" + v.befehl + "“ fehlt in " + (klasse === "host-windows" ? "host-windows.js" : "host-linux.js") + " (_namen)");
          }
        }
      }
      erwarte.gleich(fehler, [], "Befehle ohne Quelle in der passenden Geräteart");
    });

    pruefe("F1/a: jeder Hilfen-Befehl läuft auf einem Gerät SEINER Geräteart ohne „kenne ich nicht“", () => {
      const fehler = [];
      for (const v of DATEN.hilfen.VORSCHLAEGE) {
        for (const klasse of klassenVon(v)) {
          const {n, id} = netzFuerKlasse(klasse);
          /* nurTyp beachten: „switchport …“ gilt nur am Switch, „ip route …“ nur am Router */
          if (klasse === "ios" && v.nurTyp && !v.nurTyp.includes(n.geraete[id].typ)) {
            if (v.nurTyp.includes("switch")) { if (!n.geraete.sw1) continue; }
          }
          const ziel = klasse === "ios" && v.nurTyp && v.nurTyp.includes("switch") ? "sw1" : id;
          if (!n.geraete[ziel]) continue;
          const r = CLI.eingabe(sitzungIn(n, ziel, modusFuerKlasse(v, klasse)), v.befehl);
          if (UNBEKANNT.test(String(r.ausgabe || ""))) fehler.push(v.id + " auf " + ziel + ": „" + v.befehl + "“ → " + String(r.ausgabe).split("\n").slice(-1)[0]);
        }
      }
      erwarte.gleich(fehler, [], "Befehle, die die CLI der Geräteart nicht kennt");
    });

    /* ================= b) Lehrtext-Handlungen ================= */
    /* Handlungen und Befehle, die das Labor nicht kann: Sie dürfen nur mit ausdrücklichem
       „echtes Gerät“-Hinweis im selben Feld stehen. */
    const NUR_ECHTS = /echten? (Geräten|Hardware|Systemen)|echtes (IOS|DNS|Windows)|echte Hardware|nicht das Labor|zum Nachschlagen/i;
    const LAB_UNMOEGLICH = [
      {name: "STP als Handlung", muster: /(lass|lass\s+)[^.]{0,60}Spanning\s+Tree[^.]{0,60}blockieren|spanning-tree\s+(vlan|portfast|mode|root)/i},
      {name: "STP auf echten Geräten", muster: /(Spanning\s+Tree[^.]{0,80}blockier|blockier[^.]{0,80}Spanning\s+Tree)/i},
      {name: "IPv6-Konfiguration", muster: /\bipv6\s+(unicast-routing|address)\b/i},
      {name: "switchport nonegotiate", muster: /switchport\s+nonegotiate/i},
      {name: "IPv6-Nachschlagebefehl", muster: /show\s+ipv6\s+neighbors|netsh\s+interface\s+ipv6/i},
      {name: "nslookup -type", muster: /nslookup\s+-type=/i},
    ];
    /* Nur echte Befehlszitate zählen: Kommandowort, danach ein Argument (oder Ende). Deutsche Meldungen
       wie „PING: Fehler …“ / „Ping-Anforderung konnte …“ sind keine Befehle. */
    const ZITAT_BEFEHL = /^(show|ipv6|spanning-tree|ping|traceroute|tracert|ip|no|switchport|enable|configure|copy|write|erase|delete|reload|ipconfig|arp|netsh|route|nslookup|dig|ss|systemctl|telnet|curl|shutdown|interface|pathping)(\s|$)/i;
    pruefe("F2/b: keine im Labor unmögliche Handlung ohne Kennzeichnung – und zitierte Befehle kennt die CLI", () => {
      const woerter = alleBefehlswoerter();
      const kopfWoerter = new Set([...woerter, ...CLI.HOST_BEFEHLE.windows._namen({}).map(x => String(x).toLowerCase()),
                                   ...CLI.HOST_BEFEHLE.linux._namen({}).map(x => String(x).toLowerCase())]);
      const fehler = [], anz = {handlung: 0, zitat: 0};
      erwarte.wahr(Object.keys(DATEN.lehrtexte).length >= 34, "Lehrtexte geprüft: " + Object.keys(DATEN.lehrtexte).length);
      for (const [code, t] of Object.entries(DATEN.lehrtexte)) {
        for (const feld of ["E", "AP1", "AP2"]) {
          const text = String(t[feld] || "");
          for (const u of LAB_UNMOEGLICH) {
            const m = u.muster.exec(text);
            if (!m) continue;
            anz.handlung++;
            if (!NUR_ECHTS.test(text)) fehler.push(code + "." + feld + ": „" + m[0] + "“ (" + u.name + ") ist im Labor unmöglich und nicht als echtes Gerät markiert");
          }
          for (const m of text.matchAll(/„([^“]{2,80})“/g)) {
            const zitat = m[1].trim();
            if (!ZITAT_BEFEHL.test(zitat)) continue;
            anz.zitat++;
            const kopf = zitat.split(/\s+/)[0].toLowerCase();
            if (!kopfWoerter.has(kopf) && !NUR_ECHTS.test(text))
              fehler.push(code + "." + feld + ": Befehl „" + zitat + "“ kennt die CLI nicht und ist nicht als echtes Gerät markiert");
          }
        }
      }
      erwarte.wahr(anz.handlung > 0, "mindestens eine heikle Handlung wird geprüft (sonst prüft der Test nichts)");
      erwarte.wahr(anz.zitat >= 8, "mindestens 8 zitierte Befehle geprüft, sind " + anz.zitat);
      erwarte.gleich(fehler, []);
    });

    /* ================= c) TTL und Probe-Art je Betriebssystem ================= */
    pruefe("F3/c: TTL-Start je Betriebssystem stimmt mit src/sim/l3.js (Windows 128, Linux 64)", () => {
      const n = netzMitAllen();
      const ttl = id => Sim.l3.ttlStart(n.geraete[id]);
      erwarte.gleich(ttl("pc1"), 128, "Windows-PC startet mit 128");
      erwarte.gleich(ttl("srv1"), 64, "Linux-Server startet mit 64 (A-Befund F3: vorher 128)");
      Modell.geraet(n, "nas", {id: "nas1", name: "NAS1"});
      erwarte.gleich(ttl("nas1"), 64, "NAS (Linux) startet mit 64");
      n.geraete.srv1.os = "windows";              /* so setzt der Inspektor es (geraet.os, nicht running.os) */
      erwarte.gleich(ttl("srv1"), 128, "Server mit Windows im Inspektor startet mit 128");
      n.geraete.pc1.os = "linux";
      erwarte.gleich(ttl("pc1"), 64, "PC mit Linux im Inspektor startet mit 64");
      /* Vertrag §16.3 (Fassung 26.10.2026): Endgeräte-Startwerte zentral in l3.js; Router, Switch und
         Internet führen ihre eigene TTL in ihren Modulen (Gerätewerte, keine Endgerät-Startwerte). */
      erwarte.passt(quelle("src/sim/l3.js"), /TTL\s*=\s*\{windows:\s*128,\s*linux:\s*64/,
        "l3.js führt die Endgeräte-Startwerte zentral (Windows 128, Linux 64)");
      erwarte.passt(quelle("src/sim/router.js"), /ttl:\s*255/, "router.js führt seinen eigenen TTL-Wert");
      erwarte.passt(quelle("src/sim/switch.js"), /ttl:\s*255/, "switch.js führt seinen eigenen TTL-Wert");
      erwarte.passt(quelle("src/sim/internet.js"), /TTL_SERVER\s*=\s*63/, "internet.js führt seinen eigenen TTL-Wert");
      /* Kein Endgerät-TTL-Literal außerhalb von l3.js in den beiden Dateien des Auftrags. */
      for (const rel of ["src/sim/l3.js", "src/sim/aufrufe.js"])
        erwarte.falsch(/ttl:\s*\d/.test(quelle(rel)), rel + ": TTL-Literal außerhalb der Tabelle in l3.js");
    });

    pruefe("F3/c: Ping auf Linux-Server liefert TTL 64, auf Windows-PC 128 (messbar, nicht behauptet)", () => {
      const n = Modell.neu();
      Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
      Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
      Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
      Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "srv1"}, {geraet: "sw1", port: "Fa0/2"});
      for (const [id, ip] of [["pc1", "192.168.1.10"], ["srv1", "192.168.1.20"]]) {
        Modell.setzen(n, id, "if.eth0.ip", ip); Modell.setzen(n, id, "if.eth0.maske", "255.255.255.0");
      }
      const zumServer = Sim.ping(n, "pc1", "192.168.1.20", {anzahl: 1});
      erwarte.wahr(zumServer.ok, "Ping zum Server kommt an");
      erwarte.gleich(zumServer.antworten.map(a => a.ttl), [64], "Antwort-TTL des Linux-Servers");
      const zumPc = Sim.ping(n, "pc1", "192.168.1.10", {anzahl: 1});
      erwarte.gleich((zumPc.antworten || []).map(a => a.ttl), [128], "Antwort-TTL des Windows-PCs");
    });

    pruefe("F4/c: Linux-Traceroute sendet UDP-Proben, Windows-Traceroute ICMP – sichtbares Ergebnis bleibt gleich", () => {
      function netz(){                       /* PCA 10.0.1.10 – SW1 – R1 – SW2 – PCB 10.0.2.10 */
        const n = Modell.neu();
        Modell.geraet(n, "router", {id: "r1", name: "R1"});
        Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
        Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
        Modell.geraet(n, "pc", {id: "pca", name: "PCA"});
        Modell.geraet(n, "pc", {id: "pcb", name: "PCB"});
        Modell.verbinden(n, {geraet: "pca"}, {geraet: "sw1", port: "Fa0/1"});
        Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
        Modell.verbinden(n, {geraet: "r1", port: "Gi0/1"}, {geraet: "sw2", port: "Gi0/1"});
        Modell.verbinden(n, {geraet: "pcb"}, {geraet: "sw2", port: "Fa0/1"});
        for (const [id, ip, gw, typ] of [["pca", "10.0.1.10", "10.0.1.1", "pc"], ["pcb", "10.0.2.10", "10.0.2.1", "pc"]]) {
          Modell.setzen(n, id, "if.eth0.ip", ip); Modell.setzen(n, id, "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, id, "if.eth0.gw", gw);
        }
        Modell.setzen(n, "r1", "if.Gi0/0.ip", "10.0.1.1"); Modell.setzen(n, "r1", "if.Gi0/0.maske", "255.255.255.0"); Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false);
        Modell.setzen(n, "r1", "if.Gi0/1.ip", "10.0.2.1"); Modell.setzen(n, "r1", "if.Gi0/1.maske", "255.255.255.0"); Modell.setzen(n, "r1", "if.Gi0/1.shutdown", false);
        return n;
      }
      const win = Sim.traceroute(netz(), "pca", "10.0.2.10");
      erwarte.wahr(win.ok, "Windows-Traceroute erreicht das Ziel");
      erwarte.gleich(win.hops.length, 2, "zwei Stationen: R1, PCB");
      const winProben = win.trace.ereignisse.filter(e => e.frame && e.frame.icmp && e.frame.icmp.typ === "echo-request");
      erwarte.wahr(winProben.length >= 2, "Windows sendet ICMP-Echo-Proben (" + winProben.length + ")");
      erwarte.gleich(win.trace.ereignisse.filter(e => e.frame && e.frame.ip && e.frame.ip.proto === "UDP").length, 0, "Windows-Traceroute sendet kein UDP");

      const n2 = netz();
      Modell.geraet(n2, "server", {id: "srv", name: "SRV"});
      Modell.verbinden(n2, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/2"});
      Modell.setzen(n2, "srv", "if.eth0.ip", "10.0.1.20"); Modell.setzen(n2, "srv", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n2, "srv", "if.eth0.gw", "10.0.1.1");
      const lin = Sim.traceroute(n2, "srv", "10.0.2.10");
      erwarte.wahr(lin.ok, "Linux-Traceroute erreicht das Ziel (Port unreachable beendet die Suche)");
      erwarte.gleich(lin.hops.map(h => h.ip), ["10.0.1.1", "10.0.2.10"], "dieselben Stationen wie beim Windows-Traceroute");
      const udpProben = lin.trace.ereignisse.filter(e => e.frame && e.frame.ip && e.frame.ip.proto === "UDP" && e.frame.udp && e.frame.udp.dst >= 33434);
      erwarte.wahr(udpProben.length >= 2, "Linux sendet UDP-Proben auf hohe Ports (" + udpProben.length + ")");
      erwarte.gleich(lin.trace.ereignisse.filter(e => e.frame && e.frame.icmp && e.frame.icmp.typ === "echo-request").length, 0, "Linux-Traceroute sendet kein ICMP-Echo");
    });

    /* ================= F1/F5: show ip arp und „Incomplete“ ================= */
    pruefe("F1/F5: Das Labor kennt show ip arp – Wiki und Lehrtext behaupten es nicht mehr als fehlend", () => {
      const wikiText = Object.values(DATEN.wiki).map(w => (w.abschnitte || []).map(a => a.html).join(" ")).join(" ");
      erwarte.falsch(/kennt diesen Befehl nicht/i.test(wikiText), "wiki.js behauptet weiter, das Labor kenne einen Befehl nicht");
      erwarte.enthaelt(wikiText, "show ip arp", "die ARP-Seite nennt den Befehl");
      const n = netzMitAllen(), s = sitzungIn(n, "r1", "priv");
      const r = CLI.eingabe(s, "show ip arp");
      erwarte.falsch(UNBEKANNT.test(String(r.ausgabe || "")), "R1 kennt show ip arp: " + String(r.ausgabe).slice(0, 120));
      erwarte.enthaelt(String(r.ausgabe), "Protocol  Address", "echte ARP-Tabellenkopfzeile");
      erwarte.falsch(/Incomplete/.test(String(r.ausgabe)), "die Labor-Ausgabe kennt keinen Incomplete-Zustand");
      erwarte.enthaelt(quelle("src/cli/ios-befehle.js"), 'S("arp"', "show ip arp steht im Befehlsbaum (Quelle)");
      const ap2 = String(DATEN.lehrtexte.ARP_NO_REPLY.AP2);
      erwarte.falsch(/IOS show ip arp: „Incomplete“/.test(ap2), "AP2-Spalte verspricht weiter die Incomplete-Ausgabe");
      erwarte.enthaelt(ap2, "kein Eintrag für das Ziel", "AP2 nennt die echte Labor-Ausgabe");
      erwarte.passt(ap2, /echte Hardware|echten? Geräten/, "der Incomplete-Zustand ist als echtes Gerät markiert");
    });

    /* ================= F2/F6: Sturm-Lehrtext ================= */
    pruefe("F2/F6: Sturm-Lehrtext nennt STP nur als echtes Gerät, AP2 nennt die echte Meldung", () => {
      const t = DATEN.lehrtexte.STORM;
      erwarte.wahr(!!t, "STORM-Lehrtext existiert");
      erwarte.falsch(/oder lass Spanning Tree/i.test(t.E), "F2: STP darf keine Handlungsoption im Labor sein");
      erwarte.enthaelt(t.E, "Entferne die doppelte Verbindung", "die im Labor mögliche Handlung steht da");
      erwarte.passt(t.E, /echten? Geräten/, "STP ist als echtes Gerät markiert");
      erwarte.falsch(/MACFLAP/.test(t.AP2), "F6: MAC-Flapping ist nicht der Sturm");
      erwarte.enthaelt(String(t.AP2), "Abbruch nach " + Sim.BUDGET + " Ereignissen", "AP2 zitiert den echten Abbruchtext der Simulation (Sim.BUDGET)");
      erwarte.enthaelt(String(t.AP2), "Broadcast-Sturm", "AP2 benennt den Sturm");
      erwarte.passt(String(t.AP2), /STORM_CONTROL-3-SHUTDOWN/, "AP2 nennt die echte IOS-Storm-Control-Meldung");
      erwarte.passt(String(t.AP2), /echtes IOS/, "die IOS-Meldung ist als echtes Gerät markiert");
    });

    /* ================= F7: DNS-Grenze gekennzeichnet ================= */
    pruefe("F7: DNS-Grenze präzise gekennzeichnet – Sim ohne Cache, Konsole zeigt Cache/TTL", () => {
      const dnsSeite = DATEN.wiki["lab.dns"] || {};
      const text = (dnsSeite.abschnitte || []).map(a => a.html).join(" ");
      erwarte.enthaelt(text, "Echtes DNS, nicht das Labor", "F7: Grenze ist ausdrücklich gekennzeichnet");
      /* Die Unterscheidung muss stehen: Sim cacht nicht, die Konsole zeigt Cache und TTL. */
      erwarte.passt(text, /merkt sich die Antwort für die nächste Auflösung nicht/, "F7: Sim-Auflösung ohne Cache benannt");
      erwarte.enthaelt(text, "ipconfig /displaydns", "F7: die Cache-Anzeige der Konsole ist benannt");
      erwarte.enthaelt(text, "Gültigkeitsdauer", "F7: die angezeigte TTL ist benannt");
      erwarte.enthaelt(text, "ipconfig /flushdns", "F7: das Leeren des Caches ist benannt");
      erwarte.enthaelt(text, "dig", "F7: die Linux-Anzeige ist benannt");
      /* Quelle/Gegenprobe: die Sim kennt nur A-Anfragen ohne Cache und ohne TTL-Feld. */
      const n = Modell.neu();
      Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
      Modell.geraet(n, "server", {id: "srv", name: "SRV"});
      Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
      Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/2"});
      Modell.setzen(n, "pc1", "if.eth0.ip", "192.168.1.10"); Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, "pc1", "if.eth0.dns", "192.168.1.5");
      Modell.setzen(n, "srv", "if.eth0.ip", "192.168.1.5"); Modell.setzen(n, "srv", "if.eth0.maske", "255.255.255.0");
      Modell.setzen(n, "srv", "dienste.dns", {an: true, eintraege: [{name: "pc.labor", ip: "192.168.1.10"}]});
      const a = Sim.dns(n, "pc1", "pc.labor");
      erwarte.wahr(a.ok, "DNS-Auflösung klappt");
      erwarte.gleich(a.ip, "192.168.1.10");
      erwarte.falsch("ttl" in a, "Sim.dns liefert kein TTL-Feld");
      erwarte.falsch("cache" in a, "Sim.dns liefert kein Cache-Feld");
      const b = Sim.dns(n, "pc1", "pc.labor");
      const anfragen = tr => (tr.ereignisse || []).filter(e => e.frame && e.frame.app && e.frame.app.proto === "DNS" && /Anfrage/.test(String(e.frame.app.info || ""))).length;
      erwarte.wahr(anfragen(b.trace) >= 1, "die zweite Anfrage geht wieder über das Netz – kein Cache in der Sim");
      /* Die Gegenprobe zur Wiki-Aussage: die Konsole zeigt den Cache wirklich an. */
      const s = sitzungIn(n, "pc1", "host");
      CLI.eingabe(s, "ping pc.labor");
      erwarte.enthaelt(String(CLI.eingabe(s, "ipconfig /displaydns").ausgabe), "Gültigkeitsdauer", "die Konsole zeigt den Cache mit TTL");
      CLI.eingabe(s, "ipconfig /flushdns");
      erwarte.enthaelt(String(CLI.eingabe(s, "ipconfig /displaydns").ausgabe), "leer", "flushdns leert den Anzeige-Cache");
    });

    /* ================= d) Jede „Labor kann nicht“-Aussage ist gedeckt ================= */
    /* Eine Aussage der Form „das Labor kennt/kann X nicht“ muss eine Messung dahinter haben.
       Die Liste ist die Deckung; die Gegenprobe unten sucht JEDEN Labor-Satz und verlangt einen Treffer. */
    function wikiSaetze(){
      const saetze = [];
      for (const [id, w] of Object.entries(DATEN.wiki || {})) {
        for (const a of w.abschnitte || []) {
          /* <code>…</code> wird zu «…», damit der Befehlsname im Satz erhalten bleibt – nur so lässt
             sich eine „das Labor kennt X nicht“-Aussage gegen die echten Befehlslisten halten. */
          const mitMarkern = String(a.html || "").replace(/<code>([\s\S]*?)<\/code>/g, " «$1» ");
          const klar = mitMarkern.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
          for (const s of klar.split(/(?<=[.!?])\s+/)) if (s) saetze.push({id, satz: s});
        }
      }
      return saetze;
    }
    /* Die echten Befehlslisten je Geräteart – Quelle der 0-Treffer-Beweise. */
    function befehlslisten(){
      const sammle = name => {
        const woerter = new Set(), gesehen = new Set();
        const lauf = (knoten, tiefe) => {
          if (tiefe > 12) return;
          for (const k of knoten || []) {
            if (!k || gesehen.has(k)) continue; gesehen.add(k);
            if (typeof k.w === "string") woerter.add(k.w.toLowerCase());
            let kinder = k.k;
            if (typeof kinder === "function") { try { kinder = k.k(); } catch (e) { kinder = null; } }
            if (Array.isArray(kinder)) lauf(kinder, tiefe + 1);
          }
        };
        lauf((CLI.baeumeBauen()[name] || {}).k, 0);
        return woerter;
      };
      const ios = new Set();
      for (const name of ["exec", "config", "if", "vlan", "line", "std", "ext", "dhcp", "dhcpHost"])
        for (const w of sammle(name)) ios.add(w);
      return {ios, fw: sammle("fw"),
              "host-windows": new Set(CLI.HOST_BEFEHLE.windows._namen({}).map(x => String(x).toLowerCase())),
              "host-linux": new Set(CLI.HOST_BEFEHLE.linux._namen({}).map(x => String(x).toLowerCase()))};
    }
    /* «…» im Satz ist ein Befehl aus dem Wiki; nur solche Tokens werden gegen die Listen geprüft. */
    const BEFEHLKOPF = /^(show|ipv6|spanning-tree|ping|traceroute|tracert|ip|no|switchport|enable|configure|copy|write|erase|delete|reload|ipconfig|arp|netsh|route|nslookup|dig|ss|systemctl|telnet|curl|shutdown|interface|pathping)\b/i;
    const SONDERFAELLE = [
      {name: "IPv6 ist Nachschlagen, nicht Konfiguration", muster: /Labor rechnet mit IPv4|IPv6 steht hier zum Nachschlagen/i,
       pruefe: () => {
         const cliDateien = fs.readdirSync(path.join(WURZEL, "src", "cli")).filter(n => n.endsWith(".js"));
         const ipv6 = cliDateien.filter(n => /ipv6/i.test(quelle("src/cli/" + n)));
         erwarte.gleich(ipv6, [], "IPv6-Befehle in src/cli (Wiki sagt: nur Nachschlagen)");
       }},
      {name: "IPv6-Befehle werden abgewiesen", muster: /weist beide (Nachschlage-)?Befehle ab|keine IPv6-Konfiguration/i,
       pruefe: () => {
         const n = netzMitAllen(), s = sitzungIn(n, "r1", "config");
         const a = CLI.eingabe(s, "ipv6 unicast-routing");
         erwarte.wahr(UNBEKANNT.test(String(a.ausgabe || "")) || !!a.fehler, "Router weist ipv6 unicast-routing ab");
         const sw = sitzungIn(netzMitAllen(), "pc1", "host");
         const b = CLI.eingabe(sw, "netsh interface ipv6 show neighbors");
         erwarte.wahr(!!b.fehler || /nicht gefunden/i.test(String(b.ausgabe || "")), "Windows weist netsh interface ipv6 ab");
       }},
      {name: "show ip arp listet nur aufgelöste Einträge", muster: /Labor listet nur aufgelöste Einträge|Incomplete.*echte IOS-Hardware/i,
       pruefe: () => {
         const n = netzMitAllen(), r = CLI.eingabe(sitzungIn(n, "r1", "priv"), "show ip arp");
         erwarte.falsch(/Incomplete/.test(String(r.ausgabe || "")), "show ip arp der Sim kennt kein Incomplete");
       }},
      {name: "DNS: nur die einfache Form", muster: /Labor kennt nur die einfache Form|Labor fragt nur A-Einträge/i,
       pruefe: () => {
         function netzDns(){
           const n = Modell.neu();
           Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
           Modell.geraet(n, "server", {id: "srv", name: "SRV"});
           Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
           Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
           Modell.verbinden(n, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/2"});
           Modell.setzen(n, "pc1", "if.eth0.ip", "192.168.1.10"); Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, "pc1", "if.eth0.dns", "192.168.1.5");
           Modell.setzen(n, "srv", "if.eth0.ip", "192.168.1.5"); Modell.setzen(n, "srv", "if.eth0.maske", "255.255.255.0");
           Modell.setzen(n, "srv", "dienste.dns", {an: true, eintraege: [{name: "pc.labor", ip: "192.168.1.10"}]});
           return n;
         }
         const einfach = CLI.eingabe(sitzungIn(netzDns(), "pc1", "host"), "nslookup pc.labor").ausgabe;
         const typ = CLI.eingabe(sitzungIn(netzDns(), "pc1", "host"), "nslookup -type=AAAA pc.labor").ausgabe;
         erwarte.enthaelt(String(einfach), "192.168.1.10", "einfache Form liefert die A-Adresse");
         erwarte.falsch(/AAAA/.test(String(typ)), "nslookup -type=AAAA fragt im Labor keine AAAA-Einträge (Grenze)");
       }},
      {name: "kein switchport nonegotiate", muster: /Labor kennt dieses Kommando nicht|nonegotiate/i,
       pruefe: () => {
         const n = netzMitAllen(), s = sitzungIn(n, "sw1", "if");
         const r = CLI.eingabe(s, "switchport nonegotiate");
         erwarte.wahr(UNBEKANNT.test(String(r.ausgabe || "")) || !!r.fehler, "Switch weist switchport nonegotiate ab");
         const baum = baumPfad("if", "switchport nonegotiate");
         erwarte.gleich(baum.getroffen, 1, "der Baum kennt nur switchport, nicht nonegotiate");
       }},
      {name: "kein spanning-tree-Befehl, nur running-config-Zeile", muster: /Labor kennt keinen\s+spanning-tree\s*-?\s*Befehl|das Labor zeigt STP nur/i,
       pruefe: () => {
         const n = netzMitAllen(), s = sitzungIn(n, "sw1", "config");
         const r = CLI.eingabe(s, "spanning-tree vlan 10 root primary");
         erwarte.wahr(UNBEKANNT.test(String(r.ausgabe || "")) || !!r.fehler, "Switch weist spanning-tree ab");
         erwarte.enthaelt(CLI.runningConfig(n.geraete.sw1), "spanning-tree", "STP steht als Zeile in der running-config (Wiki-Aussage)");
       }},
      {name: "Sim-Auflösung ohne Cache, Konsole zeigt Cache", muster: /merkt sich die Antwort für die nächste Auflösung nicht/i,
       pruefe: () => {
         function netzDns(){
           const n = Modell.neu();
           Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
           Modell.geraet(n, "server", {id: "srv", name: "SRV"});
           Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
           Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
           Modell.verbinden(n, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/2"});
           Modell.setzen(n, "pc1", "if.eth0.ip", "192.168.1.10"); Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, "pc1", "if.eth0.dns", "192.168.1.5");
           Modell.setzen(n, "srv", "if.eth0.ip", "192.168.1.5"); Modell.setzen(n, "srv", "if.eth0.maske", "255.255.255.0");
           Modell.setzen(n, "srv", "dienste.dns", {an: true, eintraege: [{name: "pc.labor", ip: "192.168.1.10"}]});
           return n;
         }
         const n = netzDns(), s = sitzungIn(n, "pc1", "host");
         CLI.eingabe(s, "ping pc.labor");                       /* per Name: füllt den Anzeige-Cache der Konsole */
         const cache = String(CLI.eingabe(s, "ipconfig /displaydns").ausgabe);
         erwarte.enthaelt(cache, "Gültigkeitsdauer", "ipconfig /displaydns zeigt die Gültigkeitsdauer (Wiki-Aussage)");
         erwarte.enthaelt(cache, "300", "die Anzeige-TTL ist 300 s");
         CLI.eingabe(s, "ipconfig /flushdns");
         erwarte.enthaelt(String(CLI.eingabe(s, "ipconfig /displaydns").ausgabe), "leer", "ipconfig /flushdns leert den Anzeige-Cache");
         /* Die Sim-Auflösung selbst cacht nicht: zweite Anfrage geht wieder über das Netz. */
         const n2 = netzDns(), b1 = Sim.dns(n2, "pc1", "pc.labor"), b2 = Sim.dns(n2, "pc1", "pc.labor");
         const anfragen = tr => (tr.ereignisse || []).filter(e => e.frame && e.frame.app && e.frame.app.proto === "DNS" && /Anfrage/.test(String(e.frame.app.info || ""))).length;
         erwarte.wahr(b1.ok && b2.ok, "beide Auflösungen klappen");
         erwarte.wahr(anfragen(b1.trace) >= 1 && anfragen(b2.trace) >= 1, "beide Anfragen gehen über das Netz (kein Cache in der Sim)");
         erwarte.falsch("ttl" in b1, "Sim.dns liefert kein TTL-Feld");
       }},
      {name: "Sim fragt nur A-Einträge", muster: /fragt nur A-Einträge/i,
       pruefe: () => {
         const n = Modell.neu();
         Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
         Modell.geraet(n, "server", {id: "srv", name: "SRV"});
         Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
         Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
         Modell.verbinden(n, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/2"});
         Modell.setzen(n, "pc1", "if.eth0.ip", "192.168.1.10"); Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, "pc1", "if.eth0.dns", "192.168.1.5");
         Modell.setzen(n, "srv", "if.eth0.ip", "192.168.1.5"); Modell.setzen(n, "srv", "if.eth0.maske", "255.255.255.0");
         Modell.setzen(n, "srv", "dienste.dns", {an: true, eintraege: [{name: "pc.labor", ip: "192.168.1.10"}]});
         const d = Sim.dns(n, "pc1", "pc.labor");
         const typen = (d.trace.ereignisse || []).filter(e => e.frame && e.frame.app && e.frame.app.felder && e.frame.app.felder.typ).map(e => e.frame.app.felder.typ);
         erwarte.wahr(typen.length > 0 && typen.every(t => t === "A"), "nur A-Anfragen in der Sim, sind: " + [...new Set(typen)].join(","));
         /* Konsole: dig zeigt A, nslookup -type=AAAA wird ignoriert (keine AAAA-Anfrage). */
         const n3 = Modell.neu();
         Modell.geraet(n3, "switch", {id: "sw1", name: "SW1"});
         Modell.geraet(n3, "server", {id: "srv", name: "SRV"});
         Modell.geraet(n3, "nas", {id: "nas1", name: "NAS1"});
         Modell.verbinden(n3, {geraet: "nas1"}, {geraet: "sw1", port: "Fa0/1"});
         Modell.verbinden(n3, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/2"});
         Modell.setzen(n3, "nas1", "if.eth0.ip", "192.168.1.6"); Modell.setzen(n3, "nas1", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n3, "nas1", "if.eth0.dns", "192.168.1.5");
         Modell.setzen(n3, "srv", "if.eth0.ip", "192.168.1.5"); Modell.setzen(n3, "srv", "if.eth0.maske", "255.255.255.0");
         Modell.setzen(n3, "srv", "dienste.dns", {an: true, eintraege: [{name: "pc.labor", ip: "192.168.1.10"}]});
         const dig = String(CLI.eingabe(sitzungIn(n3, "nas1", "host"), "dig pc.labor").ausgabe);
         erwarte.enthaelt(dig, "300", "dig zeigt die feste Anzeige-TTL (Wiki-Aussage)");
         erwarte.passt(dig, /IN\s+A\s+192\.168\.1\.10/, "dig zeigt den A-Eintrag");
         erwarte.falsch(/AAAA/.test(dig), "dig fragt im Labor kein AAAA");
       }},
      {name: "Port-Security auf Trunk abgewiesen", muster: /Labor weist sie auf einem Trunk-Port ausdrücklich ab/i,
       pruefe: () => {
         const n = netzMitAllen(), s = sitzungIn(n, "sw1", "if");
         CLI.eingabe(s, "switchport mode trunk");
         const r = CLI.eingabe(s, "switchport port-security");
         erwarte.wahr(!!r.fehler || /trunk port|rejected/i.test(String(r.ausgabe || "")),
           "das Labor weist Port-Security auf einem Trunk-Port ab");
         const s2 = sitzungIn(netzMitAllen(), "sw1", "if");
         CLI.eingabe(s2, "switchport mode access");
         const ok = CLI.eingabe(s2, "switchport port-security");
         erwarte.falsch(!!ok.fehler, "auf einem Access-Port nimmt das Labor Port-Security an");
       }},
      /* Neue Wiki-Seiten der S6-Fertigkeiten (O4) nennen ihre Grenzen ehrlich – jede Grenze braucht eine Messung. */
      {name: "WLAN wird nicht simuliert", muster: /Labor simuliert kein WLAN/i,
       pruefe: () => {
         erwarte.gleich((Modell.TYPEN || []).filter(t => /^(ap|wlan|accesspoint)$/i.test(t)), [], "kein WLAN-Gerätetyp im Modell");
         const treffer = [];
         for (const ordner of ["sim", "cli"]) for (const n of fs.readdirSync(path.join(WURZEL, "src", ordner)).filter(x => x.endsWith(".js")))
           if (/802\.11|\bWLAN\b|Funkzelle|Assoziation/i.test(quelle("src/" + ordner + "/" + n))) treffer.push(ordner + "/" + n);
         erwarte.gleich(treffer, [], "WLAN/Funk in Sim oder CLI (Wiki sagt: nicht simuliert)");
       }},
      {name: "Betrieb: Syslog/Alarme/Sicherung nur beschrieben", muster: /Syslog-Server, Schwellwert-Alarme und Rückspielen einer Sicherung werden hier beschrieben und bewertet, nicht ausgeführt/i,
       pruefe: () => {
         const listen = befehlslisten(), woerter = new Set();
         for (const menge of Object.values(listen)) for (const w of menge) woerter.add(w);
         for (const w of ["syslog", "backup", "restore", "snmp", "schwellwert", "threshold"])
           erwarte.falsch(woerter.has(w), "Befehl „" + w + "“ existiert im Labor, obwohl das Wiki „nicht ausgeführt“ sagt");
       }},
    ];
    pruefe("H/F7/d: jede „das Labor kann/kennt nicht“-Aussage ist gegen die echten Befehlslisten gemessen", () => {
      const listen = befehlslisten(), alleWoerter = new Set();
      for (const menge of Object.values(listen)) for (const w of menge) alleWoerter.add(w);
      /* 0-Treffer-Beweis: Ein Befehl gilt im Labor als unbekannt, wenn ihn KEINE Geräteart kennt –
         geprüft wird das an den Wörtern, die die echten Befehlsbäume und _namen hergeben. */
      const befehlImLabor = token => {
        const woerter = String(token).trim().split(/\s+/).map(w => w.toLowerCase());
        return woerter.every(w => alleWoerter.has(w));
      };
      let anzahl = 0, befehlsprufungen = 0;
      const offen = [], falsch = [], nur = [];
      for (const {id, satz} of wikiSaetze()) {
        /* Nur Sätze, in denen Labor/Simulation das Subjekt der Aussage ist – nicht jede Erwähnung
           (z. B. „(im Labor selten)“ in einer Tabelle) ist eine Grenzaussage. */
        if (!/(Labor\s+(kennt|kann|rechnet|simuliert|weist|listet|zeigt|fragt|merkt)\b)|(Simulation\s+(fragt|merkt|kennt|kann)\b)/i.test(satz)) continue;
        if (!/(nicht|kein|keine|keinen|nur| ab\b)/i.test(satz)) continue;
        anzahl++;
        /* „listet nur …“ / „zeigt nur …“ ist eine Mengenaussage über die Ausgabe, KEINE Aussage
           „diesen Befehl kennt das Labor nicht“. Ein Tabellensatz kann dabei ein Befehls-Token aus
           einer Nachbarzelle mitschleppen (lab.arp: „show ip arp“ + „das Labor listet nur aufgelöste
           Einträge“) – der gehört nicht in den 0-Treffer-Test. Gemessen wird die Mengenaussage über
           einen benannten SONDERFALL. */
        if (/Labor\s+(listet|zeigt)\s+nur\s/i.test(satz)) {
          if (!SONDERFAELLE.some(s => s.muster.test(satz))) offen.push(id + ": " + satz);
          continue;
        }
        if (/Labor\s+kennt\s+nur\s/i.test(satz)) {
          /* „kennt nur <Befehl>“ ist ohne Kategorienbeweis nicht prüfbar – genau so blieb die
             falsche pathping-Aussage grün. Zulässig nur als benannter, gemessener Sonderfall. */
          if (!SONDERFAELLE.some(s => s.muster.test(satz))) nur.push(id + ": " + satz);
          continue;
        }
        const tokens = [...satz.matchAll(/«([^»]{2,80})»/g)].map(m => m[1].trim()).filter(t => BEFEHLKOPF.test(t));
        if (tokens.length) {
          befehlsprufungen += tokens.length;
          for (const t of tokens)
            if (befehlImLabor(t)) falsch.push(id + ": „" + t + "“ wird als unbekannt behauptet, steht aber in einer Befehlsliste");
          continue;
        }
        if (!SONDERFAELLE.some(s => s.muster.test(satz))) offen.push(id + ": " + satz);
      }
      erwarte.gleich(nur, [], "„das Labor kennt nur <Befehl>“ ist nicht prüfbar – Aussage konkretisieren");
      erwarte.gleich(falsch, [], "Wiki behauptet einen Befehl als unbekannt, den das Labor kennt");
      erwarte.gleich(offen, [], "Labor-Aussagen ohne Messung (SONDERFAELLE ergänzen und messen)");
      erwarte.wahr(anzahl >= 8, "geprüfte Labor-Aussagen, sind " + anzahl);
      erwarte.wahr(befehlsprufungen >= 3, "0-Treffer-Beweise über Befehlsnamen, sind " + befehlsprufungen);
      for (const s of SONDERFAELLE) s.pruefe();
    });

    pruefe("H: pathping ist im Labor vorhanden – das Wiki behauptet es nicht mehr als fehlend", () => {
      const text = ((DATEN.wiki["lab.ttl"] || {}).abschnitte || []).map(a => a.html).join(" ");
      erwarte.enthaelt(text, "pathping", "die TTL-Seite nennt pathping");
      erwarte.falsch(/Labor kennt nur\s*(<code>)?\s*tracert/i.test(text), "keine falsche „kennt nur tracert“-Aussage");
      erwarte.passt(text, /im Labor zeigt[^.]{0,80}pathping/i, "die Seite beschreibt das echte Laborverhalten");
      const r = CLI.eingabe(sitzungIn(netzMitAllen(), "pc1", "host"), "pathping 192.168.1.1");
      erwarte.falsch(UNBEKANNT.test(String(r.ausgabe || "")), "das Labor kennt pathping (host-windows.js:167)");
    });

    /* ================= e) Lehrtext-Abdeckung ================= */
    pruefe("e: Lehrtext-Abdeckung 30/30 – 46 Texte, keine Ausnahme mehr (2.1 S5)", () => {
      const skills = DATEN.skills.map(s => s.id);
      const mitText = new Set(Object.entries(DATEN.lehrtexte).filter(([, t]) => t && t.skill).map(([, t]) => t.skill));
      for (const t of Object.values(DATEN.lehrtexte)) erwarte.wahr(skills.includes(t.skill), "Lehrtext mit unbekannter Fertigkeit: " + t.skill);
      const fehlend = skills.filter(id => !mitText.has(id)).sort();
      /* 2.1 S5 (Architektur § 17.4): 34 Sim-Code-Texte + 12 Skill-Texte = 46; jede Fertigkeit hat einen Text.
         Die früheren neun Ausnahmen (lab.switch, subnetz, tcp, cli, speichern, rostick, portfwd, dmz, storage)
         sind damit aufgehoben – der Test ist strenger als vorher, nicht lockerer. */
      erwarte.gleich(fehlend, [], "Fertigkeiten ohne Lehrtext");
      erwarte.gleich(mitText.size, skills.length, "Lehrtexte decken jede Fertigkeit ab");
      erwarte.gleich(skills.length, 30, "30 Fertigkeiten (S6a/S6b)");
      erwarte.wahr(Object.keys(DATEN.lehrtexte).length >= 46, "mindestens 46 Lehrtexte");
    });
  });
})();
