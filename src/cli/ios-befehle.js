"use strict";
/* ---------- Konsole: Befehlsbäume und Konfigurationsbefehle (IOS-ähnlich) ----------
   CLI.baeumeBauen() → {exec, config, if, vlan, line, std, ext, dhcp, fw}  (lazy, einmal je Programmlauf)
   Knotenformat: siehe parser.js. Ein Handler (f) sitzt am Befehlswort, die Argumente landen über n in a.
   Jede Konfigurationsänderung geht über Modell.setzen / Modell.loeschen / Modell.vlan / Modell.speichern /
   Modell.neustart / Modell.startupLoeschen (eine Quelle der Wahrheit); parser.js legt sie in den Verlauf.
   Vorbild: IOS 15 auf Router der 1900er-Reihe und Catalyst 2960. Nicht Belegtes ist vereinfacht („IOS-ähnlich“). */
CLI.baeumeBauen = function(){
  const C = CLI, h = C.h, Z = () => C.zeige;
  const G = s => h.geraet(s), K = s => h.konfig(s);
  const istRouter = s => G(s).typ === "router", istSwitch = s => G(s).typ === "switch";
  const priv = s => s.modus !== "user" && s.modus !== "fwUser";
  const ifs = s => (s.kontext && s.kontext.ifs) || [];
  const ifArten = s => ifs(s).map(n => h.ifArt(G(s), n));
  const alleArt = (s, pruef) => { const a = ifArten(s); return a.length > 0 && a.every(pruef); };
  const nurPort = s => alleArt(s, x => x === "port");
  const nurL3 = s => alleArt(s, x => x !== "port");
  const nurRouterIf = s => istRouter(s) && alleArt(s, x => x === "phys" || x === "sub");
  const nurSub = s => alleArt(s, x => x === "sub");
  const bestaetigt = z => /^\s*(y|ye|yes)?\s*$/i.test(z);
  const fehler = (ausgabe, tipp) => ({ausgabe, fehler: true, tipp: tipp || null});
  const W = (w, hh, d, o) => Object.assign({w, h: hh || "", d: d || ""}, o || {});
  const P = (p, t, n, hh, d, o) => Object.assign({p, t, n, h: hh || "", d: d || ""}, o || {});
  const IPN = (n, hh, d, o) => P("A.B.C.D", "ip", n, hh, d, o);
  const CONFIG_I = "%SYS-5-CONFIG_I: Configured from console by console";
  const S = (w, hh, d, fn, o) => W(w, hh, d, Object.assign({sim: true, zeigen: true, f: fn}, o || {}));

  /* ---------- gemeinsame Knoten der Konfigurationsmodi ---------- */
  const exitSub = W("exit", "Exit from this submode", "diesen Modus verlassen (eine Ebene zurück)",
    {nein: false, sim: true, f: s => { const m = C.MODI[s.modus]; s.modus = (m && m.eltern) || "config"; s.kontext = {}; return ""; }});
  const ende = W("end", "Exit from configure mode", "Konfiguration ganz verlassen, zurück zu #",
    {nein: false, sim: true, f: s => { s.modus = "priv"; s.kontext = {}; return CONFIG_I; }});
  const doN = W("do", "To run exec commands in config mode", "Exec-Befehl im Konfigurationsmodus ausführen, z. B. do show ip interface brief",
    {nein: false, k: () => C.baum("exec").k.filter(c => !c.keinDo)});
  const noN = kids => W("no", "Negate a command or set its defaults", "Befehl zurücknehmen bzw. Standard wiederherstellen",
    {nein: false, istNo: true, k: () => kids()});

  /* ================= Exec (Benutzer- und privilegierter Modus) ================= */
  function enable(s){
    if (s.modus === "priv" || s.modus === "fwPriv") return "";
    const ziel = s.modus === "fwUser" ? "fwPriv" : "priv";
    if (!K(s).enableSecret) { s.modus = ziel; return ""; }
    return {ausgabe: "", rueckfrage: {prompt: "Password: ", verdeckt: true, versuche: 0, weiter(s, z){
      if (z === K(s).enableSecret) { s.modus = ziel; return ""; }
      this.versuche++;
      if (this.versuche >= 3) return fehler("% Bad secrets", "Das enable-Passwort stimmt nicht. Groß- und Kleinschreibung zählen.");
      return {ausgabe: "", rueckfrage: this};
    }}};
  }
  function abmelden(s){
    const name = K(s).hostname; s.modus = "abgemeldet"; s.kontext = {};
    return `\n${name} con0 is now available\n\n\n\n\n\nPress RETURN to get started.`;
  }
  function confT(s){ s.modus = "config"; s.kontext = {}; return "Enter configuration commands, one per line.  End with CNTL/Z."; }
  function configure(s){
    return {ausgabe: "", rueckfrage: {prompt: "Configuring from terminal, memory, or network [terminal]? ", auto: "", weiter(s, z){
      const t = z.trim().toLowerCase();
      if (!t || "terminal".startsWith(t)) return confT(s);
      return fehler("% Nur „terminal“ ist in dieser Konsole nachgebaut.", "Kurz und üblich: „conf t“.");
    }}};
  }
  const BUILD = "Building configuration...\n[OK]";
  function writeMem(s){ Modell.speichern(G(s)); return BUILD; }
  function copyRunStart(s){
    return {ausgabe: "", rueckfrage: {prompt: "Destination filename [startup-config]? ", auto: "", weiter(s, z){
      const t = z.trim();
      if (t && t.toLowerCase() !== "startup-config")
        return fehler(`%Error opening flash:${t} (nur startup-config ist in dieser Konsole nachgebaut)`, "Mit Enter übernimmst du den Vorschlag in eckigen Klammern: startup-config.");
      Modell.speichern(G(s)); return BUILD;
    }}};
  }
  /* copy startup-config running-config: echte Geräte FÜHREN die Zeilen ZUSAMMEN; hier vereinfacht: ersetzen */
  function copyStartRun(s){
    const g = G(s);
    if (!g.startup) return fehler("%Error opening nvram:/startup-config (No such file or directory)", "Es gibt noch keine gesicherte Konfiguration. Sichern mit „copy running-config startup-config“.");
    return {ausgabe: "", rueckfrage: {prompt: "Destination filename [running-config]? ", auto: "", weiter(s){
      const st = G(s).startup;
      for (const [k, v] of Object.entries(st)) h.setzen(s, k, v);
      return `${C.konfigText(G(s), st).length} bytes copied in 0.100 secs`;
    }}};
  }
  function erase(s){
    return {ausgabe: "", rueckfrage: {prompt: "Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]", auto: "", weiter(s, z){
      if (!bestaetigt(z)) return "";
      Modell.startupLoeschen(G(s));
      return {ausgabe: "[OK]\nErase of nvram: complete\n%SYS-7-NV_BLOCK_INIT: Initialized the geometry of nvram",
              hinweis: "Die startup-config ist weg, die running-config läuft weiter. Erst nach „reload“ startet das Gerät im Werkszustand – die VLANs in vlan.dat bleiben dabei erhalten."};
    }}};
  }
  const vlanDatDa = g => g.typ === "switch" && Object.keys((g.flash && g.flash.vlans) || {}).some(v => v !== "1");
  function dateiEntfernen(s, name){
    const g = G(s), n = name.replace(/^flash:\/?/i, "").replace(/^\//, "");
    if (n.toLowerCase() === "vlan.dat" && vlanDatDa(g)) {
      for (const v of Object.keys(g.flash.vlans)) if (v !== "1") Modell.vlan(s.netz, s.id, v, null);
      return {ausgabe: "", hinweis: "vlan.dat ist gelöscht. Die VLANs verschwinden hier sofort; auf echten Switches greift das erst nach „reload“."};
    }
    if (n.toLowerCase() === "config.text" && g.typ === "switch" && g.startup) { Modell.startupLoeschen(g); return ""; }
    return fehler(`%Error deleting flash:/${n} (No such file or directory)`, "„show flash:“ zeigt, welche Dateien es gibt.");
  }
  function loeschenDatei(s, a){
    const vor = String(a.datei).replace(/^flash:\/?/i, "");
    return {ausgabe: "", rueckfrage: {prompt: `Delete filename [${vor}]? `, auto: "", weiter(s, z){
      const name = z.trim().replace(/^flash:\/?/i, "") || vor;
      return {ausgabe: "", rueckfrage: {prompt: `Delete flash:/${name}? [confirm]`, auto: "", weiter(s, z2){
        return bestaetigt(z2) ? dateiEntfernen(s, name) : "";
      }}};
    }}};
  }
  /* reload: Rückfragen wie IOS, dann Modell.neustart (running := startup oder Werkszustand) */
  function neustart(s){
    const g = G(s), mitStartup = !!g.startup;
    Modell.neustart(s.netz, s.id);
    s.kontext = {}; s.modus = "abgemeldet";
    const text = ["", "%SYS-5-RELOAD: Reload requested by console. Reload Reason: Reload Command.", "",
                  "(Neustart – Startmeldungen gekürzt)", ""];
    if (mitStartup) { text.push("Press RETURN to get started!"); return text.join("\n"); }
    text.push("         --- System Configuration Dialog ---", "");
    return {ausgabe: text.join("\n"), hinweis: "Ohne startup-config startet das Gerät im Werkszustand und bietet den Setup-Dialog an. Üblich ist „no“.",
      rueckfrage: {prompt: "Would you like to enter the initial configuration dialog? [yes/no]: ", auto: "no", weiter(s, z){
        const t = z.trim().toLowerCase();
        const vorwort = t && "yes".startsWith(t) ? "% Der Setup-Dialog ist in dieser Konsole nicht nachgebaut – weiter wie mit „no“.\n" : "";
        s.modus = "abgemeldet";
        return vorwort + "\nPress RETURN to get started!";
      }}};
  }
  function reload(s){
    const bestaetigen = {prompt: "Proceed with reload? [confirm]", auto: "", weiter(s, z){ return bestaetigt(z) ? neustart(s) : ""; }};
    if (!Modell.ungespeichert(G(s))) return {ausgabe: "", rueckfrage: bestaetigen};
    return {ausgabe: "", rueckfrage: {prompt: "System configuration has been modified. Save? [yes/no]: ", auto: "yes", weiter(s, z){
      const t = z.trim().toLowerCase();
      if (t && "yes".startsWith(t)) { Modell.speichern(G(s)); return {ausgabe: BUILD, rueckfrage: bestaetigen}; }
      if (t && "no".startsWith(t)) return {ausgabe: "", rueckfrage: bestaetigen,
        hinweis: "Mit „no“ gehen alle ungesicherten Änderungen beim Neustart verloren."};
      return {ausgabe: "% Please answer 'yes' or 'no'.", rueckfrage: this};
    }}};
  }
  /* clear-Befehle ändern nur die Laufzeit (netz.zustand), nie die Konfiguration */
  const clearArp = s => { Modell.laufzeit(s.netz, s.id).arp = {}; return ""; };
  const clearMac = s => { Modell.laufzeit(s.netz, s.id).mac = {}; return ""; };
  const clearNat = s => { Modell.laufzeit(s.netz, s.id).nat = []; return ""; };
  function quelleVonIf(s, name){ const k = h.ifKonfig(G(s), name); return k && k.ip ? k.ip : null; }

  const pingOpt = () => [
    W("repeat", "specify repeat count", "Anzahl der Pakete (Standard 5)", {k: [P("<1-2147483647>", "zahl", "repeat", "Repeat count", "", {min: 1, max: 2147483647, cr: true, k: pingOpt})]}),
    W("source", "specify source address or name", "Absender: Schnittstelle oder Adresse", {k: [
      P("IF", "if", "quelleIf", "", "", {arten: ["phys", "sub", "svi"], cr: true, k: pingOpt}),
      IPN("quelleIp", "Source address", "Absenderadresse", {cr: true, k: pingOpt})]}),
  ];
  const ping = W("ping", "Send echo messages", "Echo-Anfragen senden: ist das Ziel erreichbar?", {sim: true, k: [
    P("WORD", "wort", "ziel", "Ping destination address or hostname", "Zieladresse", {cr: true, k: pingOpt,
      f: (s, a) => C.iosPing(s, a.ziel, {anzahl: a.repeat || 5, quelle: a.quelleIp || (a.quelleIf ? quelleVonIf(s, a.quelleIf) : null)})})]});
  const traceroute = W("traceroute", "Trace route to destination", "Weg zum Ziel Router für Router anzeigen", {sim: true, k: [
    P("WORD", "wort", "ziel", "Trace route to destination address or hostname", "Zieladresse", {f: (s, a) => C.iosTraceroute(s, a.ziel)})]});

  const show = W("show", "Show running system information", "Informationen anzeigen (ändert nichts)", {sim: true, zeigen: true, k: [
    S("access-lists", "List access lists", "Access-Listen mit ihren Regeln", (s, a) => Z().acls(s, a.acl), {nur: istRouter, cr: true, k: [
      P("WORD", "wort", "acl", "ACL number or name", "nur diese Liste")]}),
    S("arp", "ARP table", "ARP-Tabelle: IP-Adresse → MAC-Adresse", s => Z().arp(s)),
    W("cdp", "CDP information", "Nachbargeräte (CDP)", {k: [S("neighbors", "CDP neighbor entries", "direkt angeschlossene Switches und Router", s => Z().cdp(s))]}),
    S("clock", "Display the system clock", "Uhrzeit des Geräts (virtuelle Zeit)", s => Z().uhr(s)),
    S("flash:", "display information about flash: file system", "Dateien im Flash (z. B. vlan.dat)", s => Z().flash(s)),
    S("history", "Display the session command history", "zuletzt eingegebene Befehle", s => s.historie.slice(-10).map(x => "  " + x).join("\n")),
    S("interfaces", "Interface status and configuration", "Schnittstellen im Detail", (s, a) => Z().interfaces(s, a.if), {cr: true, k: [
      P("IF", "if", "if", "", "", {arten: ["phys", "sub", "svi"]}),
      S("status", "Show interface line status", "Ports: verbunden?, VLAN, Tempo", s => Z().status(s), {nur: istSwitch}),
      S("trunk", "Show interface trunk information", "Trunk-Ports und ihre VLANs", s => Z().trunk(s), {nur: istSwitch})]}),
    W("ip", "IP information", "IP-Informationen", {k: [
      S("arp", "IP ARP table", "ARP-Tabelle", s => Z().arp(s)),
      W("dhcp", "Show items in the DHCP database", "DHCP-Server", {nur: istRouter, k: [
        S("binding", "DHCP address bindings", "vergebene Adressen (Leases)", s => Z().dhcpBinding(s)),
        S("conflict", "DHCP address conflicts", "Adresskonflikte (vor der Vergabe per Ping erkannt)", s => Z().dhcpKonflikt(s)),
        S("pool", "DHCP pools information", "Pools und Auslastung", s => Z().dhcpPool(s))]}),
      W("interface", "IP interface status and configuration", "Schnittstellen auf Schicht 3", {k: [
        S("brief", "Brief summary of IP status and configuration", "Kurzübersicht: Adresse und Status jeder Schnittstelle", s => Z().ipIntBrief(s))]}),
      W("nat", "IP NAT information", "NAT", {nur: istRouter, k: [
        S("translations", "Translation entries", "aktuelle Übersetzungen innen ↔ außen", s => Z().natTrans(s)),
        S("statistics", "Translation statistics", "Zähler, innen/außen-Schnittstellen, Regeln", s => Z().natStatistik(s))]}),
      S("route", "IP routing table", "Routingtabelle", s => Z().ipRoute(s)),
    ]}),
    W("mac", "MAC configuration", "MAC-Adressen", {nur: istSwitch, k: [
      S("address-table", "MAC forwarding table", "MAC-Tabelle: welche MAC an welchem Port", s => Z().macTabelle(s), {cr: true, k: [
        S("dynamic", "dynamic entry type", "nur gelernte Einträge", s => Z().macTabelle(s, true))]})]}),
    S("port-security", "Show secure port information", "Port-Security je Port", (s, a) => Z().portSecurity(s, a.if), {nur: istSwitch, cr: true, k: [
      W("interface", "Show secure interface", "nur ein Port", {k: [P("IF", "if", "if", "", "", {arten: ["phys"]})]})]}),
    S("running-config", "Current operating configuration", "aktuelle Konfiguration im RAM", (s, a) => Z().showRun(s, a.if), {nur: priv, privOnly: true, cr: true, k: [
      W("interface", "Show interface configuration", "nur eine Schnittstelle", {k: [P("IF", "if", "if", "", "", {arten: ["phys", "sub", "svi"]})]})]}),
    S("startup-config", "Contents of startup configuration", "gesicherte Konfiguration im NVRAM", s => Z().showStart(s), {nur: priv, privOnly: true}),
    S("users", "Display information about terminal lines", "wer ist angemeldet (Konsole, SSH)", s => Z().benutzer(s)),
    S("version", "System hardware and software status", "Software, Laufzeit, Speicher, Config-Register", s => Z().version(s)),
    S("vlan", "VTP VLAN status", "VLANs und ihre Ports", s => Z().vlan(s, false), {nur: istSwitch, cr: true, k: [
      S("brief", "VTP all VLAN status in brief", "Kurzübersicht", s => Z().vlan(s, true))]}),
  ]});

  const exec = {k: [
    W("clear", "Reset functions", "Tabellen leeren (Laufzeit, nicht die Konfiguration)", {nur: priv, privOnly: true, sim: true, k: [
      W("arp-cache", "Clear the entire ARP cache", "ARP-Tabelle leeren", {f: clearArp}),
      W("ip", "IP", "IP", {nur: istRouter, k: [W("nat", "Clear NAT", "NAT", {k: [W("translation", "Clear dynamic translation", "Übersetzungen", {k: [
        W("*", "Delete all dynamic translations", "alle dynamischen Übersetzungen löschen", {f: clearNat})]})]})]}),
      W("mac", "MAC forwarding table", "MAC-Tabelle", {nur: istSwitch, k: [W("address-table", "MAC forwarding table", "", {k: [
        W("dynamic", "dynamic entry type", "gelernte Einträge löschen", {f: clearMac})]})]}),
    ]}),
    W("configure", "Enter configuration mode", "Konfigurationsmodus betreten", {nur: priv, privOnly: true, sim: true, keinDo: true, cr: true, f: configure, k: [
      W("terminal", "Configure from the terminal", "über diese Konsole konfigurieren", {f: confT})]}),
    W("copy", "Copy from one file to another", "Konfiguration kopieren (z. B. sichern)", {nur: priv, privOnly: true, k: [
      W("running-config", "Copy from current system configuration", "aktuelle Konfiguration (RAM)", {k: [
        W("startup-config", "Copy to startup configuration", "… in die startup-config sichern (NVRAM)", {f: copyRunStart})]}),
      W("startup-config", "Copy from startup configuration", "gesicherte Konfiguration (NVRAM)", {k: [
        W("running-config", "Update (merge with) current system configuration", "… in die laufende Konfiguration laden", {f: copyStartRun})]})]}),
    W("delete", "Delete a file", "Datei im Flash löschen (z. B. flash:vlan.dat)", {nur: priv, privOnly: true, k: [
      P("WORD", "wort", "datei", "File to be deleted", "z. B. flash:vlan.dat", {f: loeschenDatei})]}),
    W("disable", "Turn off privileged commands", "zurück in den Benutzermodus (>)", {nur: priv, privOnly: true, sim: true, keinDo: true,
      f: s => { s.modus = "user"; s.kontext = {}; return ""; }}),
    W("enable", "Turn on privileged commands", "in den privilegierten Modus wechseln (#)", {nur: s => s.modus === "user" || s.modus === "priv", sim: true, keinDo: true, f: enable}),
    W("erase", "Erase a filesystem", "startup-config löschen", {nur: priv, privOnly: true, k: [
      W("nvram:", "nvram: Filesystem to be erased", "NVRAM löschen", {f: erase}),
      W("startup-config", "Erase contents of configuration memory", "gesicherte Konfiguration löschen", {f: erase})]}),
    W("exit", "Exit from the EXEC", "Konsole abmelden", {sim: true, keinDo: true, f: abmelden}),
    W("logout", "Exit from the EXEC", "Konsole abmelden", {sim: true, keinDo: true, f: abmelden}),
    ping,
    W("reload", "Halt and perform a cold restart", "Gerät neu starten (Ungesichertes geht verloren)", {nur: priv, privOnly: true, keinDo: true, f: reload}),
    show,
    W("terminal", "Set terminal line parameters", "Einstellungen dieser Sitzung", {sim: true, k: [
      W("length", "Set number of lines on a screen", "Zeilen pro Seite (0 = ohne Pause)", {k: [
        P("<0-512>", "zahl", "laenge", "Number of lines on screen (0 for no pausing)", "", {min: 0, max: 512, f: () => ""})]})]}),
    traceroute,
    W("write", "Write running configuration to memory, network, or terminal", "Konfiguration sichern (wie copy run start)", {nur: priv, privOnly: true, cr: true, f: writeMem, k: [
      W("erase", "Erase NV memory", "startup-config löschen", {f: erase}),
      W("memory", "Write to NV memory", "in die startup-config sichern", {f: writeMem}),
      W("terminal", "Write to terminal", "running-config anzeigen", {sim: true, zeigen: true, f: s => Z().showRun(s)})]}),
  ]};

  /* ================= Globale Konfiguration ================= */
  function hostname(s, a){
    const g = G(s);
    if (a.no) { h.setzen(s, "hostname", Modell.NAMEN[g.typ]); return ""; }
    if (!/^[A-Za-z]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(a.name))
      return fehler("% Hostname contains one or more illegal characters.", "Erlaubt sind Buchstaben, Ziffern und Bindestriche; vorne ein Buchstabe, keine Leerzeichen.");
    h.setzen(s, "hostname", a.name); return "";
  }
  function secret(s, a){
    if (a.no) { h.setzen(s, "enableSecret", null); return ""; }
    h.setzen(s, "enableSecret", a.pw); return "";
  }
  /* SSH-Zugang (Phase C): ip domain-name, crypto key generate rsa, username, line vty … transport input ssh / login local.
     IOS-ähnlich: Schlüssel werden nur vermerkt (keine echte Kryptografie), Bits 360–4096. */
  function domainName(s, a){
    if (a.no) { h.setzen(s, "domainName", ""); return ""; }
    if (!/^[A-Za-z0-9.-]+$/.test(a.name || "")) return fehler("% Invalid domain name", "z. B. labor.local");
    h.setzen(s, "domainName", a.name); return "";
  }
  function rsaErzeugen(s, bits){
    const k = K(s);
    h.setzen(s, "sshSchluessel", {bits});
    return [`The name for the keys will be: ${k.hostname}.${k.domainName}`, "",
      `% The key modulus size is ${bits} bits`, `% Generating ${bits} bit RSA keys, keys will be non-exportable...`, "[OK] (elapsed time was 1 seconds)", "",
      "%SSH-5-ENABLED: SSH 1.99 has been enabled"].join("\n");
  }
  function crypto(s, a){
    const g = G(s), k = K(s);
    if (a.zeroize) { h.setzen(s, "sshSchluessel", null); return "% All keys will be removed.\n%SSH-5-DISABLED: SSH 1.99 has been disabled"; }
    if (!k.hostname || k.hostname === Modell.NAMEN[g.typ]) return fehler(`% Please define a hostname other than ${Modell.NAMEN[g.typ]}.`, "Erst „hostname …“ setzen – der Schlüssel heißt nach Name und Domäne.");
    if (!k.domainName) return fehler("% Please define a domain-name first.", "„ip domain-name labor.local“ – dann noch einmal.");
    if (a.bits != null) return rsaErzeugen(s, a.bits);
    return {ausgabe: `The name for the keys will be: ${k.hostname}.${k.domainName}\nChoose the size of the key modulus in the range of 360 to 4096 for your\n  General Purpose Keys. Choosing a key modulus greater than 512 may take\n  a few minutes.\n`,
      rueckfrage: {prompt: "How many bits in the modulus [512]: ", auto: "", weiter(s, z){
        const n = z.trim() ? parseInt(z, 10) : 512;
        if (!(n >= 360 && n <= 4096)) return fehler("% Invalid modulus size (360–4096).", "1024 oder 2048 sind üblich; SSH Version 2 braucht mindestens 768 Bit.");
        return rsaErzeugen(s, n).split("\n").slice(2).join("\n");
      }}};
  }
  function username(s, a){
    const b = tief(K(s).benutzer || {});
    if (a.no) { delete b[a.name]; h.setzen(s, "benutzer", b); return ""; }
    b[a.name] = {pw: a.pw, art: a.art || "secret"};
    h.setzen(s, "benutzer", b); return "";
  }
  /* interface X: Subinterfaces und SVIs entstehen beim ersten Aufruf (wie IOS) */
  function ifWaehlen(s, a){
    const g = G(s), name = a.if, art = h.ifArt(g, name), k = K(s);
    if (a.no) {
      if (art === "sub") { if (k.if[name]) h.loeschen(s, "if." + name); return ""; }
      if (art === "svi") { if ((k.svi || {})[name.slice(4)]) h.loeschen(s, "svi." + name.slice(4)); return ""; }
      return fehler(" ".repeat(C.prompt(s).length + Math.max(0, a.zeile.toLowerCase().lastIndexOf(String(a.zeile.trim().split(/\s+/).pop()).toLowerCase()))) +
                    "^\n% Invalid input detected at '^' marker.", "Physische Anschlüsse lassen sich nicht löschen, nur abschalten („shutdown“).");
    }
    let ausgabe = "";
    if (art === "sub" && !k.if[name]) h.setzen(s, "if." + name, Modell.subIf(null));
    if (art === "svi" && !(k.svi || {})[name.slice(4)]) {
      h.setzen(s, "svi." + name.slice(4), {ip: "", maske: "", shutdown: false});
      const st = C.ifStatus(s.netz, G(s), name);
      ausgabe = C.statusMeldungen(G(s), name, {status: "administratively down", protokoll: "down"}, st).join("\n");
    }
    s.modus = art === "sub" ? "subif" : "if"; s.kontext = {ifs: [name]};
    return ausgabe;
  }
  function rangeWaehlen(s, a){ s.modus = "range"; s.kontext = {ifs: a.bereich.slice()}; return ""; }
  function vlanCmd(s, a){
    const g = G(s), liste = a.vlans, v = (g.flash && g.flash.vlans) || {};
    const std = x => x === 1 || (x >= 1002 && x <= 1005);
    if (a.no) {
      const d = liste.find(std); if (d) return fehler(`%Default VLAN ${d} may not be deleted.`);
      for (const x of liste) Modell.vlan(s.netz, s.id, x, null);
      return "";
    }
    const ext = liste.filter(x => x >= 1006);
    if (ext.length) return fehler(`% Failed to create VLANs ${h.vlanListeText(ext)}\nExtended VLAN(s) not allowed in current VTP mode.`,
      "VLANs ab 1006 gibt es nur im VTP-Modus „transparent“. Für das Labor reichen 2–1001.");
    for (const x of liste) if (!v[x] && !std(x)) Modell.vlan(s.netz, s.id, x);
    s.modus = "vlan"; s.kontext = {vlans: liste.slice()};
    return "";
  }
  function defaultGw(s, a){ h.setzen(s, "defaultGateway", a.no ? "" : a.gw); return ""; }
  function eigeneIp(s, ip){ return Modell.adressen(G(s)).some(x => x.ip === ip); }
  function route(s, a){
    const liste = tief(K(s).routen || []), netz = a.netz, maske = a.maske;
    if (!IP.maskeGueltig(maske) || IP.netz(netz, maske) !== netz)
      return fehler("%Inconsistent address and mask", "Das Ziel muss eine Netzadresse passend zur Maske sein (alle Host-Bits 0), z. B. 192.168.2.0 255.255.255.0.");
    const nh = a.nh || null, aus = a.aus || null;
    if (a.no) {
      const rest = liste.filter(r => !(r.netz === netz && r.maske === maske && (!nh || r.nh === nh) && (!aus || r.aus === aus)));
      if (rest.length === liste.length) return fehler("%No matching route to delete");
      h.setzen(s, "routen", rest); return "";
    }
    if (nh && eigeneIp(s, nh)) return fehler("%Invalid next hop address (it's this router)", "Next Hop ist der NÄCHSTE Router, nicht die eigene Adresse.");
    const r = {netz, maske, nh, aus, ad: a.ad || 1};
    const i = liste.findIndex(x => x.netz === netz && x.maske === maske && x.nh === nh && x.aus === aus);
    if (i >= 0) liste[i] = r; else liste.push(r);
    h.setzen(s, "routen", liste); return "";
  }
  function excluded(s, a){
    const d = tief(K(s).dhcp || {ausgeschlossen: [], pools: []}), von = a.von, bis = a.bis || a.von;
    if (IP.zuZahl(bis) < IP.zuZahl(von)) return fehler("% Invalid address range", "Erst die kleinere, dann die größere Adresse.");
    d.ausgeschlossen = (d.ausgeschlossen || []).filter(x => !(x.von === von && x.bis === bis));
    if (!a.no) d.ausgeschlossen.push({von, bis});
    h.setzen(s, "dhcp", d); return "";
  }
  function poolWaehlen(s, a){
    const d = tief(K(s).dhcp || {ausgeschlossen: [], pools: []});
    d.pools = d.pools || [];
    if (a.no) {
      const n = d.pools.length; d.pools = d.pools.filter(p => p.name !== a.pool);
      if (d.pools.length === n) return fehler(`%Pool ${a.pool} does not exist.`);
      h.setzen(s, "dhcp", d); return "";
    }
    if (!d.pools.some(p => p.name === a.pool)) { d.pools.push({name: a.pool, netz: "", maske: "", gw: "", dns: ""}); h.setzen(s, "dhcp", d); }
    s.modus = "dhcp"; s.kontext = {pool: a.pool}; return "";
  }
  function aclWaehlen(typ){
    return (s, a) => {
      const acls = tief(K(s).acls || {}), name = a.name, soll = typ === "standard" ? "standard" : "erweitert";
      if (a.no) { if (acls[name]) { delete acls[name]; h.setzen(s, "acls", acls); } return ""; }
      if (acls[name] && acls[name].typ !== soll)
        return fehler(`% A named ${acls[name].typ === "standard" ? "standard" : "extended"} IP access list with this name already exists`,
          "Standard- und erweiterte Listen brauchen verschiedene Namen.");
      if (!acls[name]) { acls[name] = {typ: soll, benannt: !/^\d+$/.test(name), regeln: []}; h.setzen(s, "acls", acls); }
      s.modus = typ === "standard" ? "std" : "ext"; s.kontext = {acl: name}; return "";
    };
  }
  /* ---------- ACL-Regeln ---------- */
  function adrTeil(a, pre){
    if (a[pre + "Any"]) return {ip: "0.0.0.0", wc: "255.255.255.255"};
    if (a[pre + "Host"]) return {ip: a[pre + "Host"], wc: "0.0.0.0"};
    if (a[pre + "Ip"]) {
      const wc = a[pre + "Wc"] || "0.0.0.0";
      return {ip: IP.zuText((IP.zuZahl(a[pre + "Ip"]) & ~IP.zuZahl(wc)) >>> 0), wc};   /* IOS maskiert die Adresse mit der Wildcard */
    }
    return null;
  }
  function portTeil(a, pre){
    const op = a[pre + "Op"]; if (!op) return null;
    return {op, ports: op === "range" ? [a[pre + "P1"], a[pre + "P2"]] : [a[pre + "P1"]]};
  }
  function regelAus(a, standard){
    return {aktion: a.aktion, proto: standard ? "ip" : a.proto, quelle: adrTeil(a, "q"), ziel: standard ? null : adrTeil(a, "z"),
            zielPort: standard ? null : portTeil(a, "z"), quellPort: standard ? null : portTeil(a, "q"), icmpTyp: standard ? null : (a.icmpTyp || null)};
  }
  C.regelAus = regelAus;
  const regelOhneSeq = r => { const x = Object.assign({}, r); delete x.seq; return JSON.stringify(x); };
  function seqListe(regeln){ let v = 0; return regeln.map(r => (v = r.seq != null ? r.seq : v + 10)); }
  C.seqListe = seqListe;
  function aclNummer(s, a){
    const name = String(a.nr), acls = tief(K(s).acls || {});
    if (a.no) {
      if (acls[name]) { delete acls[name]; h.setzen(s, "acls", acls); }
      return a.aktion ? {ausgabe: "", hinweis: `Achtung: „no access-list ${name} …“ löscht bei IOS die GANZE Liste ${name}, nicht nur diese Zeile.`} : "";
    }
    const standard = a.nr < 100;
    const acl = acls[name] || {typ: standard ? "standard" : "erweitert", benannt: false, regeln: []};
    const r = regelAus(a, standard);
    if (acl.regeln.some(x => x.seq != null)) { const e = seqListe(acl.regeln); r.seq = (e.length ? e[e.length - 1] : 0) + 10; }
    acl.regeln.push(r); acls[name] = acl;
    h.setzen(s, "acls", acls); return "";
  }
  function aclRegel(s, a){
    const name = s.kontext.acl, acls = tief(K(s).acls || {}), acl = acls[name];
    if (!acl) return fehler("% Diese Access-Liste gibt es nicht mehr.");
    const standard = acl.typ === "standard", effs = seqListe(acl.regeln);
    if (a.no) {
      let i = -1;
      if (a.aktion) { const r = regelOhneSeq(regelAus(a, standard)); i = acl.regeln.findIndex(x => regelOhneSeq(x) === r); }
      else if (a.seq != null) i = effs.indexOf(a.seq);
      if (i < 0) return fehler("% Diese Regel steht nicht in der Liste.", "„do show access-lists“ zeigt die Regeln mit ihren Nummern; „no 20“ löscht Regel 20.");
      acl.regeln.splice(i, 1);
    } else {
      const r = regelAus(a, standard);
      if (a.seq != null) {
        if (effs.includes(a.seq)) return fehler("% Duplicate sequence number", "Diese Nummer ist schon vergeben. Nimm eine freie, z. B. 15 zwischen 10 und 20.");
        acl.regeln.forEach((x, i) => { x.seq = effs[i]; });
        r.seq = a.seq; acl.regeln.push(r); acl.regeln.sort((x, y) => x.seq - y.seq);
      } else {
        if (acl.regeln.some(x => x.seq != null)) r.seq = (effs.length ? effs[effs.length - 1] : 0) + 10;
        acl.regeln.push(r);
      }
    }
    acls[name] = acl; h.setzen(s, "acls", acls); return "";
  }
  /* Grammatik: [permit|deny] (any | host A | A W) … */
  const WER = {q: ["source", "Quelle"], z: ["destination", "Ziel"]};
  function adr(pre, weiter, fertig, standard){
    const o = x => Object.assign(x, fertig ? {cr: true} : {});
    const knoten = [
      W("any", `Any ${WER[pre][0]} host`, `jede ${WER[pre][1]}`, o({n: pre + "Any", v: true, k: weiter})),
      W("host", `A single ${WER[pre][0]} host`, `genau ein Host als ${WER[pre][1]}`, {k: [IPN(pre + "Host", `${WER[pre][0][0].toUpperCase() + WER[pre][0].slice(1)} address`, "Adresse des Hosts", o({k: weiter}))]}),
    ];
    const wc = IPN(pre + "Wc", `${WER[pre][0][0].toUpperCase() + WER[pre][0].slice(1)} wildcard bits`, "Wildcard-Maske: 0 = muss passen, 1 = egal (z. B. 0.0.0.255)", o({k: weiter}));
    knoten.push(IPN(pre + "Ip", `Address to match`, `${WER[pre][1]}netz oder -adresse`, standard ? {cr: true, k: [wc]} : {k: [wc]}));
    if (!weiter) for (const n of knoten) if (!n.k) delete n.k;
    return knoten;
  }
  const OPS = {eq: ["Match only packets on a given port number", "genau dieser Port"], gt: ["Match only packets with a greater port number", "Ports größer als"],
               lt: ["Match only packets with a lower port number", "Ports kleiner als"], neq: ["Match only packets not on a given port number", "alle außer diesem Port"]};
  function ops(pre, weiter, fertig){
    return (s, ctx) => {
      const proto = ctx.args && ctx.args.proto;
      if (proto !== "tcp" && proto !== "udp") return [];
      const PP = (n, o) => P("<0-65535>", "port", n, "Port number", "Portnummer oder Name (z. B. www, domain)", Object.assign({proto}, o));
      const nach = fertig ? {cr: true, k: weiter} : {k: weiter};
      if (!weiter) delete nach.k;
      const liste = Object.entries(OPS).map(([op, [hh, d]]) => W(op, hh, d, {n: pre + "Op", v: op, k: [PP(pre + "P1", nach)]}));
      liste.push(W("range", "Match only packets in the range of port numbers", "Portbereich von … bis", {n: pre + "Op", v: "range", k: [PP(pre + "P1", {k: [PP(pre + "P2", nach)]})]}));
      return liste;
    };
  }
  const icmpTypen = (s, ctx) => (ctx.args && ctx.args.proto === "icmp") ? [
    W("echo", "Echo (ping)", "nur Echo-Anfragen (Ping hin)", {n: "icmpTyp", v: "echo"}),
    W("echo-reply", "Echo reply", "nur Echo-Antworten (Ping zurück)", {n: "icmpTyp", v: "echo-reply"})] : [];
  const nachZiel = (s, ctx) => [...ops("z", null, true)(s, ctx), ...icmpTypen(s, ctx)];
  const zielKids = () => adr("z", nachZiel, true, false);
  const nachQuelle = (s, ctx) => [...ops("q", zielKids, false)(s, ctx), ...zielKids()];
  const PROTOS = [["icmp", "Internet Control Message Protocol", "ICMP (Ping)"], ["ip", "Any Internet Protocol", "alle IP-Pakete"],
                  ["tcp", "Transmission Control Protocol", "TCP (z. B. Web, Dateifreigabe)"], ["udp", "User Datagram Protocol", "UDP (z. B. DNS, DHCP)"]];
  const extProto = () => PROTOS.map(([w, hh, d]) => W(w, hh, d, {n: "proto", v: w, k: () => adr("q", nachQuelle, false, false)}));
  const stdQuelle = () => adr("q", null, true, true);
  const aktion = (f, weiter) => [
    W("deny", "Specify packets to reject", "verwerfen", Object.assign({n: "aktion", v: "deny", k: weiter}, f ? {f} : {})),
    W("permit", "Specify packets to forward", "erlauben", Object.assign({n: "aktion", v: "permit", k: weiter}, f ? {f} : {})),
  ];
  /* NAT */
  function natListe(s, a){
    const n = tief(K(s).nat || {statisch: [], dynamisch: []});
    n.dynamisch = (n.dynamisch || []).filter(x => !(String(x.acl) === String(a.acl) && (!a.aus || x.aus === a.aus)));
    if (!a.no) n.dynamisch.push({acl: String(a.acl), aus: a.aus, overload: !!a.overload});
    h.setzen(s, "nat", n); return "";
  }
  function natStatic(s, a){
    const n = tief(K(s).nat || {statisch: [], dynamisch: []}), proto = a.proto || null;
    n.statisch = (n.statisch || []).filter(x => !(x.innen === a.innen && x.aussen === a.aussen && (x.proto || null) === proto &&
      (x.innenPort || null) === (a.innenPort || null)));
    if (!a.no) n.statisch.push({innen: a.innen, aussen: a.aussen, proto, innenPort: a.innenPort || null, aussenPort: a.aussenPort || null});
    h.setzen(s, "nat", n); return "";
  }
  const portFwd = () => [IPN("innen", "Inside local IP address", "innere (private) Adresse", {k: [
    P("<1-65535>", "zahl", "innenPort", "Local UDP/TCP port", "innerer Port", {min: 1, max: 65535, k: [
      IPN("aussen", "Inside global IP address", "äußere (öffentliche) Adresse", {k: [
        P("<1-65535>", "zahl", "aussenPort", "Global UDP/TCP port", "äußerer Port", {min: 1, max: 65535})]})]})]})];
  function banner(s, a){
    if (a.no) { h.setzen(s, "banner", ""); return ""; }
    const t = a.text, d = t[0], rest = t.slice(1), i = rest.indexOf(d);
    if (i >= 0) { h.setzen(s, "banner", rest.slice(0, i)); return ""; }
    const zeilen = rest ? [rest] : [];
    return {ausgabe: `Enter TEXT message.  End with the character '${d}'.`, rueckfrage: {prompt: "", weiter(s, z){
      const j = z.indexOf(d);
      if (j < 0) { zeilen.push(z); return {ausgabe: "", rueckfrage: this}; }
      zeilen.push(z.slice(0, j));
      h.setzen(s, "banner", zeilen.join("\n").replace(/^\n+|\n+$/g, "")); return "";
    }}};
  }
  function lineWaehlen(art){ return s => { s.modus = "line"; s.kontext = {line: art}; return ""; }; }

  const vlanListeP = P("WORD", "vlanliste", "liste", "VLAN IDs of the allowed VLANs when this port is in trunking mode", "Liste, z. B. 10,20,30 oder 10-30");
  const config = {k: []};
  config.k.push(
    W("access-list", "Add an access list entry", "nummerierte Access-Liste (1–99 Standard, 100–199 erweitert)", {nur: istRouter, k: [
      P("<1-99>", "zahl", "nr", "IP standard access list", "Standard-ACL: prüft nur die Quelle", {min: 1, max: 99, noCr: true, f: aclNummer, k: () => aktion(null, stdQuelle)}),
      P("<100-199>", "zahl", "nr", "IP extended access list", "erweiterte ACL: Protokoll, Quelle, Ziel, Port", {min: 100, max: 199, noCr: true, f: aclNummer, k: () => aktion(null, extProto)})]}),
    W("banner", "Define a login banner", "Begrüßungstext", {k: [
      W("motd", "Set Message of the Day banner", "Text beim Anmelden (Message of the Day)", {noCr: true, f: banner, k: [
        P("LINE", "rest", "text", "c banner-text c, where 'c' is a delimiting character", "Trennzeichen, Text, Trennzeichen – z. B. #Nur fuer Befugte#")]})]}),
    doN,
    W("enable", "Modify enable password parameters", "Passwort für den privilegierten Modus", {k: [
      W("secret", "Assign the privileged level secret", "enable-Passwort (verschlüsselt gespeichert)", {noCr: true, f: secret, k: [
        P("WORD", "wort", "pw", "The UNENCRYPTED (cleartext) 'enable' secret", "Passwort im Klartext")]})]}),
    ende,
    W("exit", "Exit from configure mode", "Konfigurationsmodus verlassen", {nein: false, sim: true, f: s => { s.modus = "priv"; s.kontext = {}; return CONFIG_I; }}),
    W("hostname", "Set system's network name", "Gerätenamen setzen (steht im Prompt)", {noCr: true, f: hostname, k: [
      P("WORD", "wort", "name", "This system's network name", "neuer Name, z. B. R1")]}),
    W("interface", "Select an interface to configure", "Schnittstelle zum Konfigurieren wählen", {k: [
      P("IF", "if", "if", "", "", {arten: ["phys", "sub", "svi"], f: ifWaehlen}),
      W("range", "interface range command", "mehrere Ports auf einmal, z. B. fa0/1 - 5", {nein: false, k: [
        P("LINE", "ifbereich", "bereich", "Interface range, e.g. fa0/1 - 5", "Bereich, z. B. fa0/1 - 5, fa0/7", {f: rangeWaehlen})]})]}),
    W("ip", "Global IP configuration subcommands", "globale IP-Einstellungen", {k: [
      W("access-list", "Named access-list", "benannte Access-Liste anlegen oder bearbeiten", {nur: istRouter, k: [
        W("extended", "Extended Access List", "erweitert: Protokoll, Quelle, Ziel, Port", {k: [P("WORD", "wort", "name", "Access-list name", "Name, z. B. GAST", {f: aclWaehlen("extended")})]}),
        W("standard", "Standard Access List", "Standard: nur die Quelle", {k: [P("WORD", "wort", "name", "Access-list name", "Name, z. B. VERWALTUNG", {f: aclWaehlen("standard")})]})]}),
      W("default-gateway", "Specify default gateway (if not routing IP)", "Standardgateway des Switches (Verwaltung)", {nur: istSwitch, noCr: true, f: defaultGw, k: [
        IPN("gw", "IP address of default gateway", "Adresse des Routers")]}),
      W("dhcp", "Configure DHCP server and relay parameters", "DHCP-Server", {nur: istRouter, k: [
        W("excluded-address", "Prevent DHCP from assigning certain addresses", "Adressen nicht vergeben (Router, Server, Drucker)", {f: excluded, k: [
          IPN("von", "Low IP address", "erste Adresse", {cr: true, k: [IPN("bis", "High IP address", "letzte Adresse")]})]}),
        W("pool", "Configure DHCP address pools", "DHCP-Pool anlegen oder bearbeiten", {k: [P("WORD", "wort", "pool", "Pool name", "Name, z. B. LAN", {f: poolWaehlen})]})]}),
      W("domain-name", "Define the default domain name", "Domänenname (für SSH-Schlüssel und Namen)", {noCr: true, f: domainName, k: [
        P("WORD", "wort", "name", "Default domain name", "z. B. labor.local")]}),
      W("routing", "Enable IP routing", "IP-Routing (beim Router immer an)", {nur: istRouter, f: (s, a) => a.no
        ? fehler("% Im Labor routet ein Router immer – „no ip routing“ ist nicht nachgebaut.", "Ein Router ohne Routing wäre ein Host; dafür gibt es hier PCs und Server.") : ""}),
      W("domain-lookup", "Enable IP Domain Name System hostname translation", "unbekannte Wörter per DNS auflösen (no = Tippfehler kosten keine Wartezeit)",
        {f: (s, a) => { h.setzen(s, "domainLookup", !a.no); return ""; }}),
      W("nat", "NAT configuration commands", "NAT (Adressübersetzung)", {nur: istRouter, k: [
        W("inside", "Inside address translation", "innere Adressen übersetzen", {k: [W("source", "Source address translation", "Quelladressen", {k: [
          W("list", "Specify access list describing local addresses", "welche inneren Adressen (ACL)", {k: [
            P("WORD", "wort", "acl", "Access list number or name", "ACL-Nummer oder -Name", {k: [
              W("interface", "Specify interface for global address", "Adresse dieser Schnittstelle nutzen", {k: [
                P("IF", "if", "aus", "", "", {arten: ["phys", "sub"], cr: true, f: natListe, k: [
                  W("overload", "Overload an address translation", "PAT: alle teilen sich die eine Adresse (Ports unterscheiden)")]})]})]})]}),
          W("static", "Specify static local->global mapping", "feste Zuordnung innen → außen", {f: natStatic, k: [
            W("tcp", "Transmission Control Protocol", "nur einen TCP-Port weiterleiten", {n: "proto", v: "tcp", k: portFwd}),
            W("udp", "User Datagram Protocol", "nur einen UDP-Port weiterleiten", {n: "proto", v: "udp", k: portFwd}),
            IPN("innen", "Inside local IP address", "innere (private) Adresse", {k: [IPN("aussen", "Inside global IP address", "äußere (öffentliche) Adresse")]})]})]})]})]}),
      W("route", "Establish static routes", "statische Route eintragen", {nur: istRouter, f: route, k: [
        IPN("netz", "Destination prefix", "Zielnetz, z. B. 10.0.2.0 (0.0.0.0 = Default-Route)", {k: [
          IPN("maske", "Destination prefix mask", "Maske des Zielnetzes", {noCr: true, k: () => {
            const AD = P("<1-255>", "zahl", "ad", "Distance metric for this route", "administrative Distanz (Standard 1)", {min: 1, max: 255});
            return [IPN("nh", "Forwarding router's address", "Next Hop: Adresse des nächsten Routers", {cr: true, k: [AD]}),
                    P("IF", "if", "aus", "", "", {arten: ["phys", "sub"], cr: true, k: [IPN("nh", "Forwarding router's address", "Next Hop", {cr: true, k: [AD]}), AD]})];
          }})]})]}),
    ]}),
    W("crypto", "Encryption module", "Schlüssel (für SSH)", {nein: false, k: [W("key", "Long term key operations", "RSA-Schlüssel", {k: [
      W("generate", "Generate new keys", "neu erzeugen", {k: [W("rsa", "Generate RSA keys", "RSA-Schlüsselpaar – schaltet SSH ein", {cr: true, f: crypto, k: [
        W("general-keys", "Generate a general purpose RSA key pair", "Mehrzweck-Schlüssel", {cr: true, f: crypto, k: [
          W("modulus", "Provide number of modulus bits on the command line", "Schlüssellänge direkt angeben", {k: [P("<360-4096>", "zahl", "bits", "size of the key modulus", "z. B. 1024", {min: 360, max: 4096, f: crypto})]})]}),
        W("modulus", "Provide number of modulus bits on the command line", "Schlüssellänge direkt angeben", {k: [P("<360-4096>", "zahl", "bits", "size of the key modulus", "z. B. 1024", {min: 360, max: 4096, f: crypto})]})]})]}),
      W("zeroize", "Remove keys", "Schlüssel löschen", {k: [W("rsa", "Remove RSA keys", "RSA-Schlüssel löschen – SSH aus", {n: "zeroize", v: true, f: crypto})]})]})]}),
    W("username", "Establish User Name Authentication", "lokaler Benutzer (für „login local“, SSH)", {k: [P("WORD", "wort", "name", "User name", "z. B. admin", {noCr: true, f: username, k: [
      W("secret", "Specify the secret for the user", "Passwort (verschlüsselt gespeichert)", {n: "art", v: "secret", k: [P("WORD", "wort", "pw", "The UNENCRYPTED (cleartext) user secret", "Passwort im Klartext", {f: username})]}),
      W("password", "Specify the password for the user", "Passwort (Klartext, Typ 0/7)", {n: "art", v: "password", k: [P("WORD", "wort", "pw", "The UNENCRYPTED (cleartext) user password", "Passwort im Klartext", {f: username})]})]})]}),
    W("service", "Modify use of network based services", "Dienste des Geräts", {k: [
      W("password-encryption", "Encrypt system passwords", "Passwörter in der Konfiguration verschleiern (Typ 7)", {f: (s, a) => { h.setzen(s, "pwVerschluesseln", !a.no); return ""; }})]}),
    W("line", "Configure a terminal line", "Zugang konfigurieren (Konsole, Fernzugang)", {k: [
      W("console", "Primary terminal line", "Konsolenanschluss", {k: [P("<0-0>", "zahl", "nr", "First Line number", "", {min: 0, max: 0, f: lineWaehlen("con")})]}),
      W("vty", "Virtual terminal", "Fernzugang (Telnet/SSH)", {k: [P("<0-15>", "zahl", "von", "First Line number", "erste Leitung", {min: 0, max: 15, cr: true, f: lineWaehlen("vty"), k: [
        P("<1-15>", "zahl", "bis", "Last Line number", "letzte Leitung", {min: 1, max: 15})]})]})]}),
    noN(() => config.k),
    W("vlan", "Vlan commands", "VLAN anlegen und in den VLAN-Modus wechseln", {nur: istSwitch, k: [
      P("WORD", "vlanliste", "vlans", "ISL VLAN IDs 1-4094", "VLAN-Nummer, z. B. 10 (oder 10,20)", {f: vlanCmd})]}),
  );

  /* ================= Schnittstellenmodus (if, subif, range) ================= */
  function jedeIf(s, fn){
    const aus = [];
    for (const n of ifs(s)) {
      const r = fn(n, h.ifPfad(G(s), n), h.ifKonfig(G(s), n));
      if (r && r.fehler) { if (aus.length) r.ausgabe = aus.join("\n") + "\n" + r.ausgabe; return r; }
      if (r) aus.push(typeof r === "string" ? r : r.ausgabe);
    }
    return aus.filter(Boolean).join("\n");
  }
  function shut(s, a){
    return jedeIf(s, (n, pf) => {
      const vor = C.ifStatus(s.netz, G(s), n);
      h.setzen(s, pf + ".shutdown", !a.no);
      return C.statusMeldungen(G(s), n, vor, C.ifStatus(s.netz, G(s), n)).join("\n");
    });
  }
  const beschreibung = (s, a) => jedeIf(s, (n, pf) => { h.setzen(s, pf + ".beschreibung", a.no ? "" : a.text); });
  function maskeHex(m){ const n = IP.zuZahl(m); return n == null ? m : "0x" + n.toString(16).toUpperCase().padStart(8, "0"); }
  function ipAdresse(s, a){
    const g = G(s);
    return jedeIf(s, (n, pf, k) => {
      if (a.no) { h.setzen(s, pf + ".ip", ""); h.setzen(s, pf + ".maske", ""); return ""; }
      if (!IP.maskeGueltig(a.maske)) return fehler(`Bad mask ${maskeHex(a.maske)} for address ${a.ip}`,
        "Eine Maske besteht erst aus Einsen, dann aus Nullen, z. B. 255.255.255.0 (/24).");
      if (h.ifArt(g, n) === "sub" && (k.vlan == null))
        return fehler("% Configuring IP routing on a LAN subinterface is only allowed if that\nsubinterface is already configured as part of an IEEE 802.10, IEEE 802.1Q,\nor ISL vLAN.",
          "Beim Subinterface legst du zuerst das VLAN fest: „encapsulation dot1Q " + (n.split(".")[1] || "10") + "“.");
      if (!IP.hostAdresse(a.ip, a.maske)) return fehler(`Bad mask /${IP.praefix(a.maske)} for address ${a.ip}`,
        `${a.ip} ist in ${IP.cidr(a.ip, a.maske)} die Netz- oder Broadcastadresse. Nimm eine Adresse dazwischen.`);
      for (const x of Modell.adressen(g)) {
        if (x.port === n) continue;
        const kleiner = IP.praefix(x.maske) < IP.praefix(a.maske) ? x.maske : a.maske;
        if (IP.maskeGueltig(x.maske) && IP.gleichesNetz(a.ip, x.ip, kleiner))
          return fehler(`% ${IP.netz(a.ip, a.maske)} overlaps with ${h.langName(x.port)}`,
            `Jede Schnittstelle eines Routers braucht ihr eigenes Netz. ${h.langName(x.port)} hat schon ${IP.cidr(x.ip, x.maske)}.`);
      }
      h.setzen(s, pf + ".ip", a.ip); h.setzen(s, pf + ".maske", a.maske); return "";
    });
  }
  function accessGroup(s, a){
    const feld = a.in ? "aclIn" : a.out ? "aclOut" : null;
    if (!feld) return fehler("% Incomplete command.");
    return jedeIf(s, (n, pf, k) => {
      if (a.no) { if (!a.acl || String(k[feld]) === String(a.acl)) h.setzen(s, pf + "." + feld, null); return ""; }
      h.setzen(s, pf + "." + feld, String(a.acl)); return "";
    });
  }
  function helper(s, a){
    return jedeIf(s, (n, pf, k) => {
      let l = (k.helper || []).slice();
      if (a.no) l = a.helper ? l.filter(x => x !== a.helper) : [];
      else if (!l.includes(a.helper)) l.push(a.helper);
      h.setzen(s, pf + ".helper", l); return "";
    });
  }
  const natRolle = (s, a) => jedeIf(s, (n, pf) => { h.setzen(s, pf + ".nat", a.no ? null : a.natRolle); });
  const swMode = (s, a) => jedeIf(s, (n, pf) => { h.setzen(s, pf + ".modus", a.no ? "access" : a.modus); });
  function accessVlan(s, a){
    const g = G(s), v = a.no ? 1 : a.vlan, aus = [];
    if (!a.no && !(g.flash.vlans || {})[v]) {
      if (v >= 1006) return fehler(`% Access VLAN ${v} does not exist and can not be created in the current VTP mode.`);
      if (!(v >= 1002 && v <= 1005)) { Modell.vlan(s.netz, s.id, v); aus.push(`% Access VLAN does not exist. Creating vlan ${v}`); }
    }
    jedeIf(s, (n, pf) => { h.setzen(s, pf + ".accessVlan", v); });
    return aus.length ? {ausgabe: aus.join("\n"), hinweis: `Das VLAN ${v} wurde automatisch angelegt. Einen Namen gibst du ihm mit „vlan ${v}“ und „name …“.`} : "";
  }
  const ALLE = () => Array.from({length: 4094}, (_, i) => i + 1);
  function trunkErlaubt(s, a){
    return jedeIf(s, (n, pf, k) => {
      const alt = k.trunkErlaubt === "all" ? "all" : (k.trunkErlaubt || []).slice();
      let neu;
      if (a.no || a.art === "all") neu = "all";
      else if (a.art === "none") neu = [];
      else if (a.art === "add") neu = alt === "all" ? "all" : [...new Set([...alt, ...a.liste])].sort((x, y) => x - y);
      else if (a.art === "remove") neu = (alt === "all" ? ALLE() : alt).filter(v => !a.liste.includes(v));
      else if (a.art === "except") neu = ALLE().filter(v => !a.liste.includes(v));
      else neu = a.liste.slice();
      h.setzen(s, pf + ".trunkErlaubt", neu); return "";
    });
  }
  const nativeVlan = (s, a) => jedeIf(s, (n, pf) => { h.setzen(s, pf + ".nativeVlan", a.no ? 1 : a.vlan); });
  /* Port-Security: Parameter ohne aktivierte Port-Security liegen in ports.X.psVorgabe (Erweiterung, s. Bericht) */
  const PS_STD = () => ({max: 1, verstoss: "shutdown", macs: []});
  function psAendern(s, fn){
    return jedeIf(s, (n, pf, k) => {
      const aktiv = !!k.portSecurity, ps = Object.assign(PS_STD(), tief(aktiv ? k.portSecurity : (k.psVorgabe || {})));
      const r = fn(ps, n); if (r && r.fehler) return r;
      if (aktiv) h.setzen(s, pf + ".portSecurity", ps);
      else h.setzen(s, pf + ".psVorgabe", ps);
      return "";
    });
  }
  function portSec(s, a){
    return jedeIf(s, (n, pf, k) => {
      if (a.no) {
        if (k.portSecurity) { h.setzen(s, pf + ".psVorgabe", tief(k.portSecurity)); h.setzen(s, pf + ".portSecurity", null); }
        return "";
      }
      if (k.modus === "trunk") return fehler(`Command rejected: ${h.langName(n)} is a trunk port.`, "Port-Security gehört auf Access-Ports: erst „switchport mode access“.");
      if (!k.portSecurity) { h.setzen(s, pf + ".portSecurity", Object.assign(PS_STD(), tief(k.psVorgabe || {}))); if (k.psVorgabe) h.loeschen(s, pf + ".psVorgabe"); }
      return "";
    });
  }
  const psMax = (s, a) => psAendern(s, ps => {
    const neu = a.no ? 1 : a.max;
    if (ps.macs.length > neu) return fehler(`Total secure mac-addresses on interface is greater than ${neu}.`);
    ps.max = neu;
  });
  const psVerstoss = (s, a) => psAendern(s, ps => { ps.verstoss = a.no ? "shutdown" : a.verstoss; });
  const psMac = (s, a) => psAendern(s, (ps, n) => {
    if (a.sticky && !a.mac) { if (a.no) delete ps.sticky; else ps.sticky = true; return; }
    if (!a.mac) return fehler("% Incomplete command.");
    if (a.no) { ps.macs = ps.macs.filter(m => m !== a.mac); return; }
    if (!ps.macs.includes(a.mac)) {
      if (ps.macs.length >= ps.max) return fehler(`Total secure mac-addresses on interface ${h.langName(n)} has reached maximum limit.`,
        "Erst „switchport port-security maximum …“ erhöhen.");
      ps.macs.push(a.mac);
    }
  });
  function encap(s, a){
    const g = G(s);
    return jedeIf(s, (n, pf) => {
      if (a.no) { h.setzen(s, pf + ".vlan", null); h.setzen(s, pf + ".nativ", false); return ""; }
      const eltern = n.split(".")[0];
      for (const [andere, k] of Object.entries(g.running.if)) {
        if (andere !== n && andere.startsWith(eltern + ".") && k.vlan === a.vlan)
          return fehler(`Configuration of multiple subinterfaces of the same main interface with the same VID (${a.vlan}) is not permitted.\nThis VID is already configured on ${h.langName(andere)}.`,
            "Jedes VLAN bekommt genau ein Subinterface.");
      }
      h.setzen(s, pf + ".vlan", a.vlan); h.setzen(s, pf + ".nativ", !!a.nativ); return "";
    });
  }
  const inOut = o => [W("in", "inbound packets", "eingehend (Pakete, die hier ankommen)", o), W("out", "outbound packets", "ausgehend (Pakete, die hier hinausgehen)", o)];

  const ifb = {k: []};
  ifb.k.push(
    W("description", "Interface specific description", "Beschreibung (nur Doku, z. B. Uplink-zu-R1)", {noCr: true, f: beschreibung, k: [
      P("LINE", "rest", "text", "Up to 240 characters describing this interface", "freier Text")]}),
    doN,
    W("encapsulation", "Set encapsulation type for an interface", "VLAN-Tag des Subinterfaces (Router-on-a-Stick)", {nur: nurSub, noCr: true, f: encap, k: [
      W("dot1Q", "IEEE 802.1Q Virtual LAN", "802.1Q-Tagging", {k: [P("<1-4094>", "zahl", "vlan", "IEEE 802.1Q VLAN ID", "VLAN-Nummer", {min: 1, max: 4094, cr: true, k: [
        W("native", "Make this as native vlan", "natives VLAN (Frames ohne Tag)", {n: "nativ", v: true})]})]})]}),
    ende, exitSub,
    W("ip", "Interface Internet Protocol config commands", "IP-Einstellungen der Schnittstelle", {k: [
      W("access-group", "Specify access control for packets", "Access-Liste auf die Schnittstelle legen", {nur: nurRouterIf, f: accessGroup, k: [
        P("WORD", "wort", "acl", "Access-list name or number", "Name oder Nummer der ACL", {k: inOut()}), ...inOut({nurNo: true})]}),
      W("address", "Set the IP address of an interface", "IP-Adresse und Subnetzmaske setzen", {nur: nurL3, noCr: true, f: ipAdresse, k: [
        IPN("ip", "IP address", "Adresse, z. B. 192.168.1.1", {k: [IPN("maske", "IP subnet mask", "Subnetzmaske, z. B. 255.255.255.0")]})]}),
      W("helper-address", "Specify a destination address for UDP broadcasts", "DHCP-Relay: Anfragen an diesen Server weiterleiten", {nur: nurRouterIf, noCr: true, f: helper, k: [
        IPN("helper", "IP destination address", "Adresse des DHCP-Servers")]}),
      W("nat", "NAT interface commands", "Rolle bei NAT", {nur: nurRouterIf, k: [
        W("inside", "Inside interface for address translation", "innen (privates Netz)", {n: "natRolle", v: "inside", f: natRolle}),
        W("outside", "Outside interface for address translation", "außen (Richtung Internet)", {n: "natRolle", v: "outside", f: natRolle})]}),
    ]}),
    noN(() => ifb.k),
    W("shutdown", "Shutdown the selected interface", "Schnittstelle abschalten (no shutdown = einschalten)", {f: shut}),
    W("switchport", "Set switching mode characteristics", "Einstellungen des Switch-Ports", {nur: nurPort, k: [
      W("access", "Set access mode characteristics of the interface", "Einstellungen im Access-Modus", {k: [
        W("vlan", "Set VLAN when interface is in access mode", "VLAN dieses Ports", {noCr: true, f: accessVlan, k: [
          P("<1-4094>", "zahl", "vlan", "VLAN ID of the VLAN when this port is in access mode", "VLAN-Nummer", {min: 1, max: 4094})]})]}),
      W("mode", "Set trunking mode of the interface", "Betriebsart: access (ein VLAN) oder trunk (viele VLANs)", {noCr: true, f: swMode, k: [
        W("access", "Set trunking mode to ACCESS unconditionally", "Port für ein Endgerät, genau ein VLAN", {n: "modus", v: "access"}),
        W("trunk", "Set trunking mode to TRUNK unconditionally", "Verbindung zu Switch/Router, trägt mehrere VLANs (802.1Q)", {n: "modus", v: "trunk"})]}),
      W("port-security", "Security related command", "Port-Security: nur bekannte MAC-Adressen zulassen", {cr: true, f: portSec, k: [
        W("mac-address", "Secure mac address", "erlaubte MAC-Adresse fest eintragen", {noCr: true, f: psMac, k: [
          P("H.H.H", "mac", "mac", "48 bit mac address", "MAC im Cisco-Format, z. B. 0060.2f3a.1b01"),
          W("sticky", "Configure dynamic secure addresses as sticky", "gelernte Adressen in die Konfiguration übernehmen", {n: "sticky", v: true, cr: true, k: [
            P("H.H.H", "mac", "mac", "48 bit mac address", "")]})]}),
        W("maximum", "Max secure addresses", "höchstens so viele MAC-Adressen", {noCr: true, f: psMax, k: [
          P("<1-132>", "zahl", "max", "Maximum addresses", "Anzahl", {min: 1, max: 132})]}),
        W("violation", "Security violation mode", "was bei einem Verstoß passiert", {noCr: true, f: psVerstoss, k: [
          W("protect", "Security violation protect mode", "fremde Frames still verwerfen", {n: "verstoss", v: "protect"}),
          W("restrict", "Security violation restrict mode", "verwerfen und zählen/melden", {n: "verstoss", v: "restrict"}),
          W("shutdown", "Security violation shutdown mode", "Port abschalten (err-disabled)", {n: "verstoss", v: "shutdown"})]})]}),
      W("trunk", "Set trunking characteristics of the interface", "Einstellungen im Trunk-Modus", {k: [
        W("allowed", "Set allowed VLAN characteristics when interface is in trunking mode", "erlaubte VLANs", {k: [
          W("vlan", "Set allowed VLANs when interface is in trunking mode", "welche VLANs der Trunk trägt", {noCr: true, f: trunkErlaubt, k: [
            W("add", "add VLANs to the current list", "VLANs hinzufügen", {n: "art", v: "add", k: [vlanListeP]}),
            W("all", "all VLANs", "alle VLANs (Standard)", {n: "art", v: "all"}),
            W("except", "all VLANs except the following", "alle außer …", {n: "art", v: "except", k: [vlanListeP]}),
            W("none", "no VLANs", "keine VLANs", {n: "art", v: "none"}),
            W("remove", "remove VLANs from the current list", "VLANs entfernen", {n: "art", v: "remove", k: [vlanListeP]}),
            vlanListeP]})]}),
        W("native", "Set trunking native characteristics when interface is in trunking mode", "natives VLAN (ohne Tag)", {k: [
          W("vlan", "Set native VLAN when interface is in trunking mode", "natives VLAN", {noCr: true, f: nativeVlan, k: [
            P("<1-4094>", "zahl", "vlan", "VLAN ID of the native VLAN when this port is in trunking mode", "VLAN-Nummer", {min: 1, max: 4094})]})]})]}),
    ]}),
  );

  /* ================= VLAN-Modus ================= */
  function vlanName(s, a){
    for (const v of s.kontext.vlans || []) {
      if (v === 1 || (v >= 1002 && v <= 1005)) return fehler(`%Default VLAN ${v} may not have its name changed.`);
      if (!a.no && a.name.length > 32) return fehler("% Name darf höchstens 32 Zeichen haben.");
      Modell.vlan(s.netz, s.id, v, a.no ? undefined : a.name);
    }
    return "";
  }
  const vlan = {k: []};
  vlan.k.push(doN, ende, exitSub,
    W("name", "Ascii name of the VLAN", "Name des VLANs", {noCr: true, f: vlanName, k: [P("WORD", "wort", "name", "The ascii name for the VLAN", "z. B. Verwaltung (ohne Leerzeichen)")]}),
    noN(() => vlan.k));

  /* ================= Line-Modus (Passwörter werden nur gespeichert) ================= */
  function lineAendern(s, fn){
    const lines = tief(K(s).lines || {}), art = s.kontext.line || "con";
    lines[art] = lines[art] || (art === "vty" ? {login: true} : {});
    const r = fn(lines[art], art);
    h.setzen(s, "lines", lines);
    return r || "";
  }
  const line = {k: []};
  line.k.push(doN, ende, exitSub,
    W("logging", "Modify message logging facilities", "Meldungen", {k: [
      W("synchronous", "Synchronized message output", "Meldungen unterbrechen die Eingabe nicht", {f: (s, a) => lineAendern(s, l => { if (a.no) delete l.logsync; else l.logsync = true; })})]}),
    W("login", "Enable password checking", "beim Anmelden nach dem Passwort fragen", {cr: true, f: (s, a) => lineAendern(s, (l, art) => {
      l.login = !a.no;
      if (!a.no && !l.passwort && art === "con") return {ausgabe: "% Login disabled on line 0, until 'password' is set", hinweis: "Erst „password …“ setzen, sonst fragt die Konsole nicht."};
    }), k: [W("local", "Local password checking", "Benutzername + Passwort aus „username …“ (für SSH nötig)", {f: (s, a) => lineAendern(s, l => { l.login = a.no ? true : "local"; })})]}),
    W("transport", "Define transport protocols for line", "Protokolle für den Fernzugang", {k: [W("input", "Define which protocols to use when connecting to the terminal server", "erlaubte Protokolle eingehend", {k: [
      W("ssh", "TCP/IP SSH protocol", "nur SSH (verschlüsselt) – empfohlen", {n: "proto", v: "ssh", f: (s, a) => lineAendern(s, l => { l.transport = a.no ? null : "ssh"; })}),
      W("telnet", "TCP/IP Telnet protocol", "nur Telnet (unverschlüsselt)", {n: "proto", v: "telnet", f: (s, a) => lineAendern(s, l => { l.transport = a.no ? null : "telnet"; })}),
      W("all", "All protocols", "SSH und Telnet", {n: "proto", v: "all", f: (s, a) => lineAendern(s, l => { l.transport = a.no ? null : "all"; })}),
      W("none", "No protocols", "kein Fernzugang", {n: "proto", v: "none", f: (s, a) => lineAendern(s, l => { l.transport = a.no ? null : "none"; })})]})]}),
    noN(() => line.k),
    W("password", "Set a password", "Passwort für diesen Zugang", {noCr: true, f: (s, a) => lineAendern(s, l => { if (a.no) delete l.passwort; else l.passwort = a.pw; }), k: [
      P("LINE", "rest", "pw", "The UNENCRYPTED (cleartext) line password", "Passwort im Klartext")]}),
  );

  /* ================= Named-ACL-Modi ================= */
  const seqP = kids => P("<1-2147483647>", "zahl", "seq", "Sequence Number", "Position in der Liste (Sequenznummer)", {min: 1, max: 2147483647, noCr: true, f: aclRegel, k: kids});
  const std = {k: []};
  std.k.push(...aktion(aclRegel, stdQuelle), doN, ende, exitSub, noN(() => std.k), seqP(() => aktion(aclRegel, stdQuelle)));
  const ext = {k: []};
  ext.k.push(...aktion(aclRegel, extProto), doN, ende, exitSub, noN(() => ext.k), seqP(() => aktion(aclRegel, extProto)));

  /* ================= DHCP-Pool-Modus =================
     Form des Pools: Architektur.md § 10.1 (start, anzahl, domain, leaseS, reservierungen).
     Ein neuer Pool bekommt gleich alle Felder mit Standardwert, damit die Anzeige nie ins Leere greift;
     fehlt eins in einem alten Spielstand, liefert dhcpPool() den Standard (§ 10.1 „defensiv lesen“). */
  /* ---- Arbeitsobjekt für eine Änderung ----
     EINMAL aus dem laufenden Zustand lesen, ändern, dann EINMAL zurückschreiben. `dhcpDaten` liest JEDES MAL NEU –
     wer erst einen Klon ändert und danach `dhcpDaten(s)` schreibt, schreibt den unveränderten Stand zurück. Genau
     darüber waren alle DHCP-Befehle wirkungslos (gefunden am 05.10.2026): sie meldeten keinen Fehler und änderten
     nichts. Die Prüfung „geaendert“ blieb deshalb falsch – und die Tests sahen nur den Prompt. */
  function dhcpDaten(s){ return tief(K(s).dhcp || {ausgeschlossen: [], pools: []}); }
  function dhcpArbeiten(s, fn){
    const d = dhcpDaten(s);
    const r = fn(d, (d.pools || []).find(x => x.name === (s.kontext && s.kontext.pool)) || null, K(s));
    h.setzen(s, "dhcp", d);
    return r == null ? "" : r;
  }
  function dhcpPool(s){
    const d = dhcpDaten(s);
    return (d.pools || []).find(x => x.name === (s.kontext && s.kontext.pool)) || null;
  }
  /* MAC-Schreibweisen wie im IOS: 0200.aabb.cc01, 02:00:aa:bb:cc:01, 02-00-aa-bb-cc-01 */
  function macNormal(mac){
    const hex = String(mac || "").replace(/[^0-9a-f]/gi, "").toLowerCase();
    return hex.length === 12 ? hex.match(/.{2}/g).join(":") : null;
  }
  /* Reservierung im Arbeitsobjekt holen oder anlegen (Name aus dem Kontext „host NAME“) */
  function reservierungIn(p, s){
    if (!p) return null;
    p.reservierungen = p.reservierungen || [];
    const n = String((s.kontext && s.kontext.wirt) || "").toLowerCase();
    let r = p.reservierungen.find(x => String(x.name || "").toLowerCase() === n);
    if (!r) { r = {mac: "", ip: "", name: (s.kontext && s.kontext.wirt) || "host"}; p.reservierungen.push(r); }
    return r;
  }
  /* lease {Tage [Stunden [Minuten]] | infinite} – 0/fehlend = Standard (§ 10.1) */
  function leaseSetzen(s, a){
    return dhcpArbeiten(s, (d, p) => {
      if (!p) return fehler("% Diesen Pool gibt es nicht mehr.");
      if (a.no || a.infinite) { delete p.leaseS; return ""; }
      const t = Number(a.tage), std = Number(a.stunden || 0), min = Number(a.minuten || 0);
      if (!Number.isFinite(t) || !Number.isFinite(std) || !Number.isFinite(min) || std > 23 || min > 59)
        return fehler("% Invalid lease duration", "Tage 0–365, Stunden 0–23, Minuten 0–59.");
      p.leaseS = Math.round((t * 86400) + (std * 3600) + (min * 60));
      return "";
    });
  }
  function poolFeld(s, feld, wert){
    return dhcpArbeiten(s, (d, p) => { if (!p) return fehler("% Diesen Pool gibt es nicht mehr."); p[feld] = wert; return ""; });
  }
  function poolSetzen(feld){
    return (s, a) => dhcpArbeiten(s, (d, p) => {
      if (!p) return fehler("% Diesen Pool gibt es nicht mehr.");
      if (feld === "netz") {
        if (a.no) { p.netz = ""; p.maske = ""; }
        else {
          const m = a.maske || (a.praefix != null ? IP.maske(a.praefix) : null);
          if (!m || !IP.maskeGueltig(m)) return fehler("% Invalid mask", "Maske wie 255.255.255.0 oder als Präfix /24.");
          p.netz = IP.netz(a.netz, m); p.maske = m;
        }
      } else p[feld] = a.no ? "" : a[feld];
      return "";
    });
  }
  function hostWaehlen(s, a){
    const n = String(a.host || "").trim(); if (!n) return fehler("% Incomplete command.");
    if (n.length > 32) return fehler("% Der Name der Reservierung darf höchstens 32 Zeichen haben.");
    return dhcpArbeiten(s, (d, p) => {
      if (!p) return fehler("% Diesen Pool gibt es nicht mehr.");
      if (a.no) {
        const vorher = (p.reservierungen || []).length;
        p.reservierungen = (p.reservierungen || []).filter(x => String(x.name || "").toLowerCase() !== n.toLowerCase());
        if (p.reservierungen.length === vorher) return fehler(`% Die Reservierung „${n}“ gibt es in diesem Pool nicht.`);
        return "";
      }
      s.modus = "dhcpHost";
      s.kontext = {pool: (s.kontext && s.kontext.pool) || null, wirt: n};
      const r = reservierungIn(p, s); r.name = n;
      return "";
    });
  }
  function reservierungMac(s, a){
    return dhcpArbeiten(s, (d, p) => {
      if (!p) return fehler("% Diesen Pool gibt es nicht mehr.");
      const r = reservierungIn(p, s); if (!r) return fehler("% Erst „host NAME“ wählen.");
      if (a.no) { r.mac = ""; return ""; }
      const m = macNormal(a.mac);
      if (!m) return fehler(`% Ungültige Hardware-Adresse: ${a.mac}`, "Schreibweise wie im IOS: 0200.aabb.cc01 (12 Hex-Ziffern, Punkte oder Doppelpunkte).");
      const doppelt = (p.reservierungen || []).find(x => x !== r && macNormal(x.mac) === m);
      if (doppelt) { r.mac = ""; return fehler(`% ${m} ist schon für „${doppelt.name}“ reserviert.`, "Eine MAC-Adresse kann in einem Pool nur auf eine IP zeigen."); }
      r.mac = m; return "";
    });
  }
  function reservierungIp(s, a){
    return dhcpArbeiten(s, (d, p) => {
      if (!p) return fehler("% Diesen Pool gibt es nicht mehr.");
      const r = reservierungIn(p, s); if (!r) return fehler("% Erst „host NAME“ wählen.");
      if (a.no) { r.ip = ""; return ""; }
      const ip = IP.zuText(IP.zuZahl(a.ip));
      if (p.netz && p.maske && !IP.imNetz(ip, p.netz, p.maske))
        return fehler(`% ${ip} liegt nicht im Netz ${p.netz} ${p.maske} des Pools.`, "Eine Reservierung muss aus dem Subnetz des Pools kommen.");
      const doppelt = (p.reservierungen || []).find(x => x !== r && x.ip === ip);
      if (doppelt) { r.ip = ""; return fehler(`% ${ip} ist schon für „${doppelt.name}“ reserviert.`, "Zwei Reservierungen dürfen nicht auf dieselbe IP zeigen."); }
      r.ip = ip; return "";
    });
  }
  const dhcp = {k: []};
  /* WICHTIG: `n` am Positionsknoten bestimmt, unter welchem Namen der Wert in `a` landet (parser.js:241) –
     ohne `n` wird die Eingabe geparst und dann verworfen. `f` gehört an den Knoten, der den Befehl ausführt. */
  dhcp.k.push(
    W("default-router", "Default routers", "Standardgateway für die Clients", {noCr: true, f: poolSetzen("gw"), k: [
      P("A.B.C.D", "ip", "gw", "Router's IP address", "Adresse des Routers im Client-Netz", {f: poolSetzen("gw")})]}),
    W("dns-server", "DNS servers", "DNS-Server für die Clients", {noCr: true, f: poolSetzen("dns"), k: [
      P("A.B.C.D", "ip", "dns", "Server's IP address", "Adresse des DNS-Servers", {f: poolSetzen("dns")})]}),
    doN, ende, exitSub,
    W("network", "Network number and mask", "Netz, aus dem der Pool Adressen vergibt", {noCr: true, f: poolSetzen("netz"), k: [
      P("A.B.C.D", "ip", "netz", "Network number in dotted-decimal notation", "Netzadresse", {k: [
        P("A.B.C.D", "ip", "maske", "Network mask", "Subnetzmaske", {f: poolSetzen("netz")}),
        P("/nn", "praefix", "praefix", "Network mask prefix length", "Präfixlänge, z. B. /24", {f: poolSetzen("netz")})]})]}),
    W("lease", "Address lease time", "Lease-Dauer in Tagen, Stunden und Minuten („infinite“ = unbegrenzt)", {noCr: true, f: leaseSetzen, k: [
      /* cr: true, weil „lease 2“ schon vollständig ist (2 Tage); Stunden und Minuten sind freiwillig. */
      P("<0-365>", "zahl", "tage", "Days", "Tage (0–365)", {min: 0, max: 365, cr: true, k: [
        P("<0-23>", "zahl", "stunden", "Hours", "Stunden (0–23)", {min: 0, max: 23, cr: true, k: [
          P("<0-59>", "zahl", "minuten", "Minutes", "Minuten (0–59)", {min: 0, max: 59})]})]}),
      W("infinite", "Infinite lease", "unbegrenzte Lease", {n: "infinite", v: true, f: leaseSetzen})]}),
    W("domain-name", "Domain name for the pool", "Domänenname, den die Clients als Option 15 bekommen (suffix für Namen ohne Punkt)",
      {noCr: true, f: poolSetzen("domain"), k: [
        P("WORD", "wort", "domain", "Domain name", "z. B. labor.local", {f: poolSetzen("domain")})]}),
    W("host", "Reserve an address for a host", "feste Zuordnung MAC → IP (Reservierung) anlegen und bearbeiten", {k: [
      P("WORD", "wort", "host", "Host name or client identifier", "Name für die Reservierung, z. B. drucker", {f: hostWaehlen})]}),
    noN(() => dhcp.k),
  );
  /* Untermodus der Reservierung (Architektur § 10.1): erst „host NAME“, dann MAC und IP.
     Er ist in parser.js als eigener Modus registriert (sonst wäre er unerreichbar); der Kontext mit dem gewählten
     Namen wird nach dem Moduswechsel neu gesetzt, weil ein Moduswechsel den Kontext leert. */
  const dhcpHost = {k: []};
  dhcpHost.k.push(
    W("hardware-address", "Hardware address", "MAC-Adresse des Geräts, das diese IP fest bekommt", {noCr: true, f: reservierungMac, k: [
      P("H.H.H", "wort", "mac", "48-bit hardware address of the host", "z. B. 0200.aabb.cc01", {f: reservierungMac})]}),
    W("ip", "IP address of the host", "feste IP-Adresse für diese MAC", {noCr: true, f: reservierungIp, k: [
      P("A.B.C.D", "ip", "ip", "IP address of the host", "z. B. 192.168.10.50", {f: reservierungIp})]}),
    exitSub, ende, doN,
    noN(() => dhcpHost.k),
  );


  /* ================= Firewall (Grundzüge: anzeigen und testen) ================= */
  const fwPriv = s => s.modus === "fwPriv";
  const fwConf = () => fehler("% Diese Firewall ist herstellerneutral: Regeln, Zonen und NAT stellst du im Inspektor ein.\n% Hier gibt es nur Anzeige- und Testbefehle (show, ping, traceroute).");
  const fw = {k: [
    W("configure", "Enter configuration mode", "Konfiguration (bei der Firewall im Inspektor)", {nur: fwPriv, privOnly: true, sim: true, cr: true, f: fwConf, k: [W("terminal", "Configure from the terminal", "", {})]}),
    W("disable", "Turn off privileged commands", "zurück in den Benutzermodus", {nur: fwPriv, privOnly: true, sim: true, f: s => { s.modus = "fwUser"; return ""; }}),
    W("enable", "Turn on privileged commands", "privilegierter Modus", {nur: s => s.modus === "fwUser", sim: true, f: enable}),
    W("exit", "Exit from the EXEC", "abmelden", {sim: true, f: abmelden}),
    ping,
    W("show", "Show running system information", "Informationen anzeigen", {sim: true, zeigen: true, k: [
      S("arp", "ARP table", "ARP-Tabelle", s => Z().arp(s)),
      W("ip", "IP information", "IP", {k: [
        W("interface", "IP interface status", "Schnittstellen", {k: [S("brief", "Brief summary", "Kurzübersicht", s => Z().ipIntBrief(s))]}),
        S("route", "IP routing table", "Routingtabelle", s => Z().ipRoute(s))]}),
      S("route", "Routing table", "Routingtabelle", s => Z().ipRoute(s)),
      S("running-config", "Current operating configuration", "Konfiguration (neutrale Darstellung)", s => Z().showRun(s), {nur: fwPriv, privOnly: true}),
      S("version", "System software status", "Software", s => Z().version(s))]}),
    traceroute,
  ]};

  return {exec, config, if: ifb, vlan, line, std, ext, dhcp, dhcpHost, fw};
};
