"use strict";
/* TERMINAL (Phase C): Windows (cmd + PowerShell-Auszug) und Linux (bash) je Betriebssystem; Ausgaben in stabiler Form,
   Befund für die Akte, Konfiguration ändern nur per netsh/route bzw. sudo ip/systemctl – über den Verlauf (Rückgängig),
   Eingabe-Fuzz ohne Ausnahme, Tipp-Zeilen nach Stufenregel. */
gruppe("CLI: Terminal Windows/Linux", () => {
  const buero = () => Spiel.vorlagen.buero.bauen(Zufall(1)).netz;        /* srv 10.135.10.5 (Linux, DNS/HTTP/DHCP), pc1 per DHCP, drucker statisch */
  const sitz = (netz, id, o = {}) => CLI.sitzung(netz, id, Object.assign({verlauf: Modell.verlauf(netz)}, o));
  const e = (s, ...zeilen) => { let r; for (const z of zeilen) r = CLI.eingabe(s, z); return r; };

  pruefe("Betriebssystem: PC Windows, Server/NAS Linux, Router IOS; geraet.os übersteuert; Prompt passt", () => {
    const n = buero();
    erwarte.gleich(["pc1", "srv", "r1"].map(id => Modell.osVon(n.geraete[id])), ["windows", "linux", "ios"]);
    erwarte.gleich(CLI.prompt(sitz(n, "pc1")), "C:\\>");
    erwarte.gleich(CLI.prompt(sitz(n, "srv")), "admin@server:~$");
    n.geraete.drucker.os = "linux";
    erwarte.gleich(CLI.prompt(sitz(n, "drucker")), "admin@drucker:~$");
    const s = sitz(n, "pc1"); e(s, "powershell");
    erwarte.gleich(CLI.prompt(s), "PS C:\\>");
    e(s, "exit"); erwarte.gleich(CLI.prompt(s), "C:\\>");
  });

  pruefe("Windows: ipconfig, ping, tracert, nslookup (auch interaktiv), arp, route, getmac, curl, PowerShell – mit Befund", () => {
    const n = buero(), s = sitz(n, "drucker");
    let r = e(s, "ipconfig");
    erwarte.enthaelt(r.ausgabe, "IPv4-Adresse  . . . . . . . . . . : 10.135.20.30");
    erwarte.enthaelt(r.ausgabe, "Standardgateway . . . . . . . . . : 10.135.20.1");
    erwarte.wahr(/10\.135\.20\.30\/24 · Gateway 10\.135\.20\.1/.test(r.befund), "Befund ipconfig: " + r.befund);
    r = e(s, "ping 10.135.20.1");
    erwarte.enthaelt(r.ausgabe, "Antwort von 10.135.20.1: Bytes=32");
    erwarte.enthaelt(r.ausgabe, "Pakete: Gesendet = 4, Empfangen = 4, Verloren = 0");
    erwarte.wahr(r.trace && r.befund === "4/4 Antworten" && r.ok, "Befund ping");
    r = e(s, "ping gibtsnicht.local");
    erwarte.enthaelt(r.ausgabe, 'Ping-Anforderung konnte Host "gibtsnicht.local" nicht finden.');
    erwarte.falsch(r.ok);
    erwarte.enthaelt(e(s, "tracert 10.135.10.5").ausgabe, "Ablaufverfolgung beendet.");
    r = e(s, "nslookup server.buero.local");
    erwarte.wahr(/Name:\s+server\.buero\.local/.test(r.ausgabe) && /Address:\s+10\.135\.10\.5/.test(r.ausgabe), r.ausgabe);
    erwarte.enthaelt(e(s, "nslookup www.beispiel.de").ausgabe, "Non-existent domain");          /* der Büro-DNS leitet (noch) nicht weiter */
    r = e(s, "nslookup");
    erwarte.gleich(CLI.prompt(s), ">");
    erwarte.wahr(/10\.135\.20\.30/.test(e(s, "drucker.buero.local").ausgabe), "interaktiv: Name");
    e(s, "exit"); erwarte.gleich(CLI.prompt(s), "C:\\>");
    erwarte.wahr(/10\.135\.20\.1\s+[0-9a-f-]{17}\s+dynamisch/.test(e(s, "arp -a").ausgabe), "ARP nach dem Ping");
    erwarte.wahr(/0\.0\.0\.0\s+0\.0\.0\.0\s+10\.135\.20\.1/.test(e(s, "route print").ausgabe), "Standardroute");
    erwarte.wahr(/^[0-9A-F]{2}(-[0-9A-F]{2}){5}\s/m.test(e(s, "getmac").ausgabe), "getmac");
    r = e(s, "curl http://server.buero.local");
    erwarte.wahr(/<h1>server\.buero\.local<\/h1>/.test(r.ausgabe) && r.befund === "HTTP 200 von server.buero.local", r.ausgabe);
    erwarte.enthaelt(e(s, "curl http://nix.beispiel.de").ausgabe, "curl: (6) Could not resolve host: nix.beispiel.de");
    erwarte.wahr(e(s, "Test-NetConnection server.buero.local -Port 80").fehler, "PowerShell-Befehl in cmd: Fehler mit Tipp");
    e(s, "powershell");
    erwarte.enthaelt(e(s, "Test-NetConnection server.buero.local -Port 80").ausgabe, "TcpTestSucceeded : True");
    erwarte.enthaelt(e(s, "Test-NetConnection 198.51.100.10 -Port 80").ausgabe, "TcpTestSucceeded : True");
    erwarte.enthaelt(e(s, "Resolve-DnsName drucker.buero.local").ausgabe, "10.135.20.30");
    erwarte.enthaelt(e(s, "Get-NetIPConfiguration").ausgabe, "IPv4DefaultGateway   : 10.135.20.1");
  });

  pruefe("Windows: netsh und route ändern die Konfiguration über den Verlauf – Rückgängig stellt sie wieder her", () => {
    const n = buero(), v = Modell.verlauf(n), s = CLI.sitzung(n, "drucker", {verlauf: v});
    const k = () => n.geraete.drucker.running.if.eth0;
    let r = e(s, 'netsh interface ip set address "Ethernet" static 10.135.20.77 255.255.255.0 10.135.20.1');
    erwarte.wahr(r.geaendert, "geändert");
    erwarte.gleich([k().ip, k().maske, k().gw, k().dhcp], ["10.135.20.77", "255.255.255.0", "10.135.20.1", false]);
    erwarte.gleich(v.liste.length, 1, "ein Verlaufsschritt");
    v.zurueck();
    erwarte.gleich(n.geraete.drucker.running.if.eth0.ip, "10.135.20.30", "Rückgängig");
    r = e(s, "netsh interface ip set dns name=Ethernet source=static address=198.51.100.53");
    erwarte.gleich(k().dns, "198.51.100.53");
    e(s, "route delete 0.0.0.0");
    erwarte.gleich(k().gw, "");
    e(s, "route add 0.0.0.0 mask 0.0.0.0 10.135.20.1");
    erwarte.gleich(k().gw, "10.135.20.1");
    erwarte.enthaelt(e(s, "netsh interface ip show config").ausgabe, "Standardgateway:                      10.135.20.1");
    r = e(s, 'netsh interface ip set address "WLAN" static 1.2.3.4 255.0.0.0');
    erwarte.wahr(r.fehler && !r.geaendert, "unbekannte Schnittstelle");
    e(s, 'netsh interface ip set address "Ethernet" dhcp');
    erwarte.wahr(k().dhcp, "DHCP an");
  });

  pruefe("Linux: ip a/r, ping -c, traceroute, dig/nslookup/host, ss, systemctl, cat, sudo-Änderungen über den Verlauf, tcpdump", () => {
    const n = buero(), v = Modell.verlauf(n), s = CLI.sitzung(n, "srv", {verlauf: v});
    let r = e(s, "ip a");
    erwarte.enthaelt(r.ausgabe, "inet 10.135.10.5/24 brd 10.135.10.255 scope global eth0");
    erwarte.gleich(r.befund, "eth0 10.135.10.5/24");
    erwarte.enthaelt(e(s, "ip r").ausgabe, "default via 10.135.10.1 dev eth0 proto static");
    r = e(s, "ping -c 2 10.135.10.1");
    erwarte.enthaelt(r.ausgabe, "2 packets transmitted, 2 received, 0% packet loss");
    erwarte.wahr(/64 bytes from 10\.135\.10\.1: icmp_seq=1 ttl=\d+ time=/.test(r.ausgabe), r.ausgabe);
    erwarte.enthaelt(e(s, "traceroute 10.135.20.30").ausgabe, "traceroute to 10.135.20.30 (10.135.20.30), 30 hops max");
    r = e(s, "dig drucker.buero.local");
    erwarte.wahr(/ANSWER SECTION:\ndrucker\.buero\.local\.\s+300\s+IN\s+A\s+10\.135\.20\.30/.test(r.ausgabe), r.ausgabe);
    erwarte.enthaelt(e(s, "host server.buero.local").ausgabe, "server.buero.local has address 10.135.10.5");
    erwarte.enthaelt(e(s, "dig www.beispiel.de").ausgabe, "status: NXDOMAIN");
    erwarte.enthaelt(e(s, "nslookup gibtsnicht.buero.local").ausgabe, "NXDOMAIN");
    erwarte.wahr(/tcp\s+LISTEN.*0\.0\.0\.0:80/.test(e(s, "ss -tulpn").ausgabe), "ss: Webserver lauscht");
    erwarte.enthaelt(e(s, "cat /etc/resolv.conf").ausgabe, "nameserver 10.135.10.5");
    erwarte.enthaelt(e(s, "systemctl status apache2").ausgabe, "Active: active (running)");
    r = e(s, "systemctl stop apache2");
    erwarte.wahr(r.fehler && /Interactive authentication required/.test(r.ausgabe), "ohne sudo kein Stopp");
    erwarte.wahr(n.geraete.srv.running.dienste.http.an, "läuft noch");
    erwarte.wahr(e(s, "sudo systemctl stop apache2").geaendert && !n.geraete.srv.running.dienste.http.an, "sudo stoppt");
    v.zurueck(); erwarte.wahr(n.geraete.srv.running.dienste.http.an, "Rückgängig");
    erwarte.wahr(e(s, "ip addr add 10.135.10.9/24 dev eth0").fehler, "ip addr add ohne sudo");
    e(s, "sudo ip addr add 10.135.10.9/24 dev eth0");
    erwarte.gleich([n.geraete.srv.running.if.eth0.ip, n.geraete.srv.running.if.eth0.maske], ["10.135.10.9", "255.255.255.0"]);
    erwarte.enthaelt(e(s, "sudo ip route add default via 10.135.10.1").ausgabe, "File exists");
    e(s, "sudo ip route replace default via 10.135.10.254");
    erwarte.gleich(n.geraete.srv.running.if.eth0.gw, "10.135.10.254");
    e(s, "ping -c 1 10.135.10.1");
    r = e(s, "sudo tcpdump -n");
    erwarte.wahr(/ICMP echo request/.test(r.ausgabe) || /ARP, Request who-has/.test(r.ausgabe), "tcpdump zeigt die letzte Simulation:\n" + r.ausgabe);
    erwarte.enthaelt(e(s, "foo").ausgabe, "foo: command not found");
  });

  pruefe("Eingabe-Fuzz: 400 zufällige Zeilen je Betriebssystem werfen nie, Antwort hat immer Text und Prompt", () => {
    const z = Zufall(42), woerter = ["ipconfig", "ping", "netsh", "interface", "ip", "set", "address", "route", "add", "sudo", "systemctl", "dig", "curl", "-c", "/all",
      "10.135.10.5", "\"Ethernet\"", "static", "255.255.255.0", "www.beispiel.de", "a", "", "?", "-Port", "ss", "tcpdump", "exit", "powershell", "nslookup", "server", "cat", "/etc/hosts"];
    for (const id of ["pc1", "srv"]) {
      const n = buero(), s = sitz(n, id);
      for (let i = 0; i < 400; i++) {
        const zeile = Array.from({length: 1 + z.zahl(6)}, () => z.wahl(woerter)).join(" ");
        const r = CLI.eingabe(s, zeile);
        erwarte.wahr(r && typeof r.ausgabe === "string" && typeof r.prompt === "string", `${id}: „${zeile}“`);
        erwarte.falsch(/Interner Fehler/.test(r.ausgabe), `${id}: „${zeile}“ → ${r.ausgabe}`);
      }
    }
  });

  pruefe("Tipp-Zeilen nach Stufenregel: Einstieg alle, AP1 nur nach Fehlern, AP2 keine", () => {
    const n = buero();
    const t = tipps => { const s = sitz(n, "drucker", {tipps}); return [/Tipp:/.test(e(s, "ping gibtsnicht.local").ausgabe), /Tipp:/.test(e(s, "ping 10.135.99.99").ausgabe)]; };
    erwarte.gleich(t("alle"), [true, true]);
    erwarte.gleich(t("fehler"), [true, false]);
    erwarte.gleich(t("keine"), [false, false]);
  });
});
