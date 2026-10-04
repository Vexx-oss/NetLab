"use strict";
/* ---------- Form „Fernwartung“ (Terminal-Forensik; Plan – Ausbau 1.2, E1.1; Architektur § 9.6) ----------
   Das Netz ist unsichtbar: Man ist per Fernwartung auf genau einem Rechner und sieht nur, was dessen Befehle zeigen.
   Darum kommen nur Fehlerarten in Frage, die man auf diesem Rechner selbst per Befehl findet UND behebt:
   Adresse, Maske, Gateway, DNS am Windows-PC (ipconfig, netsh) oder ein gestoppter Dienst am Linux-Server (systemctl).
   def.fernwartung = Geräte-ID; die Oberfläche blendet die Fläche aus und öffnet dieses Terminal. */
(Spiel.formGeneratoren ||= {}).forensik = (() => {
  const FEHLER = [
    {inj: "gateway-falsch", art: "adresse"}, {inj: "gateway-fehlt", art: "adresse"}, {inj: "ip-tippfehler", art: "adresse"},
    {inj: "maske-falsch", art: "adresse"}, {inj: "dns-fehlt", art: "dns"}, {inj: "dienst-aus", art: "dienst"}, {inj: "dhcp-aus", art: "dienst"},
  ];
  /* https fehlt mit Absicht: Im Labor-Linux schaltet „systemctl start apache2“ nur den Dienst http (offen für Phase D) */
  const UNIT = {http: "apache2", dns: "named", dhcp: "isc-dhcp-server", datei: "smbd", ssh: "ssh", druck: "cups"};

  function passend(netz, f, k){
    const g = netz.geraete[String(k.geraet || k.key).split(":")[0]];
    if (!g || !g.an) return false;
    if (f.art === "dienst") return Modell.osVon(g) === "linux";
    const a = (g.running.if || {}).eth0 || {};
    return g.typ === "pc" && g.skin !== "drucker" && !a.dhcp;                 /* feste Adresse: netsh setzt sie wieder */
  }
  function befehle(f, k, g){
    if (f.art === "dienst") {
      const dienst = f.inj === "dhcp-aus" ? "dhcp" : String(k.key).split(":")[1], unit = UNIT[dienst];
      if (!unit) return null;
      return {diag: `systemctl status ${unit}`, diagMuster: "^(sudo )?systemctl (status|is-active) \\S+$",
        fix: `sudo systemctl start ${unit}`, fixMuster: `^sudo systemctl (start|restart) ${unit.replace(/-/g, "\\-")}(\\.service)?$`};
    }
    const a = g.running.if.eth0;
    if (f.art === "dns") return {diag: "ipconfig /all", diagMuster: "^ipconfig /all$",
      fix: `netsh interface ip set dns "Ethernet" static ${a.dns}`, fixMuster: "^netsh interface ip(v4)? set dns(servers)?\\b.*$"};
    return {diag: "ipconfig", diagMuster: "^ipconfig( /all)?$",
      fix: `netsh interface ip set address "Ethernet" static ${a.ip} ${a.maske} ${a.gw}`, fixMuster: "^netsh interface ip(v4)? set address\\b.*$"};
  }

  return function(seed, opts = {}, id){
    const z = Zufall("forensik:" + seed);
    const kunde = opts.kunde || "salon";
    const vName = Spiel.vorlagen._fuerKunde[kunde] || "lan", V = Spiel.vorlagen[vName];
    const K = Spiel.kundenDaten(kunde);
    for (let versuch = 0; versuch < 14; versuch++) {
      const f = FEHLER[(z.zahl(FEHLER.length) + versuch) % FEHLER.length], inj = Spiel.INJEKTOREN[f.inj];
      if (!inj || !inj.vorlagen.includes(vName)) continue;
      const vSeed = 1 + z.zahl(1000000);
      const gesund = V.bauen(Zufall(vSeed), {kunde});
      const kand = (inj.passt(gesund.netz, gesund.rollen) || []).filter(k => passend(gesund.netz, f, k));
      if (!kand.length) continue;
      const k = kand[z.zahl(kand.length)], geraet = String(k.geraet || k.key).split(":")[0], g = gesund.netz.geraete[geraet];
      const b = befehle(f, k, g);
      if (!b) continue;
      const stufe = opts.stufe || (V.stufe >= 3 ? "AP1" : "E");
      let def = null;
      try {
        def = Spiel.ticketBauen({id, vorlage: vName, vSeed, kunde, injektoren: [{name: f.inj, ziel: k.key}], stufe, karriere: V.stufe, art: "terminal",
          maxZiele: 1, minuten: 6,
          zusatzZiele: [
            {typ: "befehl", geraet, muster: b.diagMuster, beispiel: b.diag, text: `Auf ${g.name} nachgesehen (${b.diag.split(" ").slice(0, 2).join(" ")})`},
            {typ: "befehl", geraet, muster: b.fixMuster, beispiel: b.fix, text: "Fehler per Befehl behoben"},
          ],
          loesung: [{geraet, terminal: b.fix, text: `${g.name}: ${b.fix}`}],
          hilfen: {frage: [f.art === "dienst" ? "Antwortet der Server überhaupt? Und wenn ja: Läuft der Dienst, den der Kunde braucht?" : "Was zeigt der Rechner über sich selbst – und passt das zu einem gesunden Netz?"],
            bereich: [{geraet}], konkret: [`Im Terminal von ${g.name}: ${b.fix}`]}});
      } catch (e) { def = null; }
      /* Der Fehler muss etwas brechen, das der Kunde merkt – sonst wäre es keine Störung (und der Titel fiele auf die Ursache zurück) */
      if (!def || !def.ziele.some(z => z.erwartet)) continue;
      const ap = K.ansprechpartner || {};
      def.briefing = `${z.wahl(["Hallo,", "Guten Tag,", "Hi,"])} ${def.symptom} Ich hab dir die Fernwartung auf ${g.name} freigeschaltet – mehr als die Befehlszeile hast du von hier aus nicht.\n\n${ap.name || K.name}, ${K.name}`;
      def.fernwartung = geraet;
      def.lohn = {euro: Math.round(def.lohn.euro * 1.2), ruf: def.lohn.ruf};
      def.skills = [...new Set([...(def.skills || []), "lab.ping"])].slice(0, 2);
      return def;
    }
    return null;
  };
})();
