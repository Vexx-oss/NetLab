"use strict";
/* ---------- Wiki: eine Nachschlage-Seite je Fertigkeit (DATEN.skills) ----------
   DATEN.wiki[skillId] = {titel, kurz, abschnitte:[{titel, html}], merksatz, pruefungstipp, quelle, belege, siehe:[skillIds]}
   quelle  = Name der Vault-Notiz (für „Nachschlagen“), belege = weitere Belege (RFC, IEEE, Hersteller-Doku).
   html    = schlichtes HTML: <p>, <ul>/<li>, <code>, <b>, <table>/<tr>/<th>/<td>, <pre>. Keine Klassen, keine Skripte.
   Befehle der Konsole sind „IOS-ähnlich“: an Cisco IOS angelehnt, nicht jede Feinheit ist nachgebaut. */
Object.assign(DATEN.wiki, {
  "lab.link": {
    titel: "Link und Kabel prüfen",
    kurz: "Ohne Link auf Schicht 1 kommt kein einziger Frame an, deshalb prüfst du ihn immer zuerst.",
    abschnitte: [
      {titel: "Woran du einen Link erkennst", html:
        "<p>Im Labor ist eine Leitung mit Link grün, ohne Link rot, jeweils mit Symbol. Auf Routern und Switches zeigt <code>show ip interface brief</code> zwei Spalten: <b>Status</b> (Schicht 1) und <b>Protocol</b> (Schicht 2).</p>" +
        "<table><tr><th>Status</th><th>Protocol</th><th>Bedeutung</th></tr>" +
        "<tr><td>up</td><td>up</td><td>Link steht, die Schnittstelle arbeitet</td></tr>" +
        "<tr><td>down</td><td>down</td><td>kein Signal: Kabel fehlt, Gegenstelle aus oder dort abgeschaltet</td></tr>" +
        "<tr><td>administratively down</td><td>down</td><td>hier mit <code>shutdown</code> abgeschaltet</td></tr>" +
        "<tr><td>up</td><td>down</td><td>Signal da, aber Schicht 2 einigt sich nicht (im Labor selten)</td></tr></table>" +
        "<p>Unter Windows zeigt <code>ipconfig</code> bei fehlendem Kabel „Medienstatus: Medium getrennt“.</p>"},
      {titel: "Ab Werk: Router aus, Switch an", html:
        "<p>Router-Schnittstellen sind ab Werk <b>abgeschaltet</b>, Switchports sind <b>eingeschaltet</b>. Nach dem Eintragen einer IP-Adresse am Router fehlt deshalb oft nur ein Befehl:</p>" +
        "<pre>R1(config)# interface g0/0\nR1(config-if)# no shutdown</pre>"},
      {titel: "Kabel", html:
        "<p>Ob gerades oder gekreuztes Kabel, spielt heute keine Rolle mehr: Die Ports erkennen die Belegung selbst (Auto-MDI-X). Kupfer-Ethernet reicht bis 100 m, darüber nimmt man Glasfaser.</p>"},
      {titel: "WLAN: der Link ohne Kabel", html:
        "<p>Ein <b>Access Point</b> (AP) ist die Brücke zwischen Funk und Kabel: auf der einen Seite die Antenne, auf der anderen ein Switchport. Die Funkzelle heißt BSS, ihr Name ist die <b>SSID</b>, die MAC des Funkmoduls die BSSID.</p>" +
        "<ul><li>Funk ist ein <b>geteiltes Medium</b>: Alle Geräte einer Zelle senden abwechselnd, die beworbene Bruttorate erreicht deshalb kein einzelnes Gerät.</li><li>Den Zugriff regelt <b>CSMA/CA</b> mit Bestätigung je Rahmen – gesendet wird, wenn die Luft frei ist; Kollisionen werden vermieden, nicht erkannt.</li><li>Funk arbeitet <b>halbduplex</b>: senden und empfangen nacheinander, anders als Ethernet am Kabel.</li><li>Die Verbindung entsteht per <b>Assoziation</b>: Das Gerät meldet sich am AP an. Ohne Assoziation gibt es keinen Link – dieselbe Rolle wie ein gestecktes Kabel.</li></ul>" +
        "<table><tr><th>Band</th><th>Kanäle</th><th>Eigenschaft</th></tr>" +
        "<tr><td>2,4 GHz</td><td>1 bis 13 (je nach Land); überlappungsfrei sind 1, 6 und 11</td><td>weit, aber langsamer und oft belegt</td></tr>" +
        "<tr><td>5 GHz</td><td>viele Kanäle</td><td>schneller, kürzere Reichweite</td></tr>" +
        "<tr><td>6 GHz</td><td>nur mit neueren Geräten</td><td>viel Platz, wenige Störer</td></tr></table>" +
        "<p>Störer sind Nachbarzellen auf demselben Kanal, Mikrowellen und dicke Wände. Prüfen lässt sich die Verbindung über Feldstärke und Rate; ein Ping durchs Funknetz schwankt stärker als über Kabel.</p>"},
    ],
    merksatz: "Ohne Link keine Frames: Schicht 1 zuerst prüfen.",
    pruefungstipp: "Beschreib Fehlersuche immer nach OSI von unten: Kabel und Link, IP-Konfiguration, Gateway, DNS, Dienst.",
    quelle: "Fragen – Netzwerke planen",
    belege: "Cisco IOS Interface Command Reference (show ip interface brief, shutdown) · 04-AP1-Netzwerk (Ethernet/Kabel) · IEEE 802.3 · IEEE 802.11 (WLAN, CSMA/CA) · BSI IT-Grundschutz-Kompendium, NET.2.1 WLAN-Betrieb",
    siehe: ["lab.cli", "lab.ping", "lab.ip", "lab.vlan"],
  },
  "lab.ip": {
    titel: "IP-Adresse und Maske setzen",
    kurz: "Eine IPv4-Adresse besteht aus 32 Bit; die Maske sagt, welcher Teil das Netz und welcher den Rechner bezeichnet.",
    abschnitte: [
      {titel: "Aufbau", html:
        "<p>Vier Oktette zu je 8 Bit, jedes 0 bis 255, getrennt durch Punkte: <code>192.168.1.10</code>. Die <b>Subnetzmaske</b> besteht aus lauter Einsen (Netzanteil), gefolgt von lauter Nullen (Hostanteil): <code>255.255.255.0</code> = <code>/24</code>.</p>" +
        "<ul><li><b>Netz-ID</b>: alle Hostbits 0, nicht vergebbar</li><li><b>Broadcast</b>: alle Hostbits 1, nicht vergebbar</li><li>Jede Adresse darf im Netz nur <b>einmal</b> vorkommen, sonst gibt es einen Adresskonflikt.</li></ul>"},
      {titel: "Besondere Bereiche", html:
        "<table><tr><th>Bereich</th><th>Bedeutung</th></tr>" +
        "<tr><td>10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16</td><td>privat (RFC 1918), im Internet nicht geroutet</td></tr>" +
        "<tr><td>127.0.0.0/8</td><td>Loopback, der eigene Rechner</td></tr>" +
        "<tr><td>169.254.0.0/16</td><td>APIPA: selbst vergeben, wenn kein DHCP-Server antwortet</td></tr>" +
        "<tr><td>0.0.0.0</td><td>„noch keine Adresse“ bzw. Default-Route</td></tr>" +
        "<tr><td>255.255.255.255</td><td>Broadcast an alle im eigenen Netz</td></tr></table>" +
        "<p>Achtung: 172.16.0.0/12 reicht nur bis 172.31.255.255. 172.40.1.1 ist öffentlich.</p>"},
      {titel: "Im Labor setzen", html:
        "<p>PC, Server: im Inspektor unter „Schnittstellen“ IP-Adresse, Maske, Gateway und DNS eintragen. Router (Konsole):</p>" +
        "<pre>R1(config)# interface g0/0\nR1(config-if)# ip address 192.168.1.1 255.255.255.0\nR1(config-if)# no shutdown</pre>" +
        "<p>Kontrolle: <code>ipconfig</code> am PC, <code>show ip interface brief</code> am Router.</p>"},
      {titel: "IPv6: Adresse, Präfix und Adresstypen (Nachschlagen)", html:
        "<p>IPv6-Adressen sind 128 Bit lang und werden als acht Blöcke zu 16 Bit hexadezimal geschrieben: <code>2001:0db8:0000:0000:0000:ff00:0042:8329</code>. Zwei Regeln kürzen das: führende Nullen eines Blocks fallen weg, und <b>ein einziges Mal</b> darf eine Folge von Nullblöcken durch <code>::</code> ersetzt werden.</p>" +
        "<table><tr><th>Bereich</th><th>Bedeutung</th></tr>" +
        "<tr><td>2000::/3</td><td>Global Unicast: im Internet routingfähig, das Gegenstück zur öffentlichen Adresse</td></tr>" +
        "<tr><td>fe80::/10</td><td>Link-Local: nur im eigenen Link, wird automatisch gebildet und nie geroutet</td></tr>" +
        "<tr><td>fc00::/7</td><td>Unique Local, privat – das Gegenstück zu den RFC-1918-Bereichen</td></tr>" +
        "<tr><td>ff00::/8</td><td>Multicast: erreicht Gruppen und ersetzt den Broadcast</td></tr>" +
        "<tr><td>::1</td><td>Loopback, das Gegenstück zu 127.0.0.1</td></tr>" +
        "<tr><td>::</td><td>„noch keine Adresse“</td></tr></table>" +
        "<p>Eine Subnetzmaske gibt es nicht mehr: Die Präfixlänge steht direkt an der Adresse, zum Beispiel <code>2001:db8:aa00:1::1/64</code>. Einen <b>Broadcast</b> kennt IPv6 nicht, Multicast übernimmt seine Rolle. Für Dokumentation und Beispiele ist 2001:db8::/32 reserviert – diese Adressen gehören niemandem und gehören in kein echtes Netz.</p>" +
        "<p>Ein Gerät hat meist mehrere Adressen gleichzeitig: eine Link-Local und mindestens eine globale. Kommt kein Router Advertisement an, bleibt nur die Link-Local übrig – das IPv6-Gegenstück zur APIPA-Adresse. Dieses Labor rechnet mit IPv4; IPv6 steht hier zum Nachschlagen.</p>"},
    ],
    merksatz: "Jede Adresse nur einmal vergeben, nie die Netz-ID und nie den Broadcast.",
    pruefungstipp: "Private Bereiche sicher können; 172.16.0.0/12 ist die häufigste Falle (nur 172.16 bis 172.31). In IPv6 gibt es keine Maske, nur die Präfixlänge.",
    quelle: "Network – Lernfassung",
    belege: "RFC 1918 · RFC 3927 (169.254.0.0/16) · RFC 5227 (Adresskonflikte) · Fragen – Netzwerk-Grundlagen · RFC 4291 (IPv6-Adressarchitektur) · RFC 3849 (2001:db8::/32) · RFC 4193 (Unique Local) · RFC 5952 (Schreibweise)",
    siehe: ["lab.netz", "lab.subnetz", "lab.gateway", "lab.dhcp", "lab.arp"],
  },
  "lab.netz": {
    titel: "Gleiches Netz? (Maske anwenden)",
    kurz: "Vor jedem Senden prüft ein Rechner mit seiner Maske, ob das Ziel im eigenen Netz liegt: dann direkt, sonst über das Gateway.",
    abschnitte: [
      {titel: "Die Entscheidung des Absenders", html:
        "<ul><li>Eigene IP mit eigener Maske verrechnen: ergibt die eigene Netz-ID.</li><li>Ziel-IP mit <b>derselben</b> Maske verrechnen: ergibt die Netz-ID des Ziels aus Sicht des Absenders.</li><li>Gleich: Ziel direkt per ARP suchen. Ungleich: Paket ans Standardgateway.</li></ul>"},
      {titel: "Beispiel mit /29", html:
        "<p>Maske <code>255.255.255.248</code>, Blockgröße 256 − 248 = 8. Die Netze beginnen bei .0, .8, .16, .24 …</p>" +
        "<table><tr><th>Adresse</th><th>Netz</th><th>Bereich</th></tr>" +
        "<tr><td>192.168.10.10/29</td><td>192.168.10.8</td><td>.8 bis .15</td></tr>" +
        "<tr><td>192.168.10.20/29</td><td>192.168.10.16</td><td>.16 bis .23</td></tr></table>" +
        "<p>Die beiden liegen in verschiedenen Netzen und brauchen einen Router, auch wenn sie am selben Switch hängen.</p>"},
      {titel: "Was eine falsche Maske anrichtet", html:
        "<ul><li><b>Zu groß</b> (z. B. /16 statt /24): Der Rechner hält Geräte hinter dem Router für Nachbarn, fragt per ARP ins Leere.</li><li><b>Zu klein</b> (z. B. /28 statt /24): Nachbarn wirken fremd, der Verkehr geht unnötig über das Gateway oder scheitert.</li></ul>"},
    ],
    merksatz: "Gleiche Netz-ID mit derselben Maske: direkt. Sonst: ab zum Gateway.",
    pruefungstipp: "Rechne immer mit der Maske des Absenders, denn er entscheidet, wohin er sendet.",
    quelle: "Network – Lernfassung",
    belege: "04-AP1-Netzwerk (Subnetting-Verfahren) · Fragen – Subnetting",
    siehe: ["lab.subnetz", "lab.gateway", "lab.arp"],
  },
  "lab.gateway": {
    titel: "Standardgateway",
    kurz: "Das Standardgateway ist der Router im eigenen Netz, dem ein Rechner alle Pakete für fremde Netze übergibt.",
    abschnitte: [
      {titel: "Regeln", html:
        "<ul><li>Das Gateway muss <b>im eigenen Netz</b> liegen, sonst ist es nicht direkt erreichbar.</li><li>Meist ist es die Adresse der Router-Schnittstelle in diesem Netz, oft die .1.</li><li>Für ein fremdes Ziel fragt der Rechner per ARP nach der MAC des <b>Gateways</b>, nie nach der des Ziels. Im ARP-Cache eines PCs stehen deshalb nie MACs von Internet-Servern.</li></ul>"},
      {titel: "Fehlerbilder", html:
        "<table><tr><th>Beobachtung</th><th>Ursache</th></tr>" +
        "<tr><td>Nachbarn gehen, fremde Netze nicht, Meldung „Allgemeiner Fehler“</td><td>kein Gateway eingetragen</td></tr>" +
        "<tr><td>Windows warnt: Gateway nicht im selben Netzwerksegment</td><td>Gateway im falschen Netz (Tippfehler, falsche Maske)</td></tr>" +
        "<tr><td>„Zielhost nicht erreichbar“ von der eigenen Adresse</td><td>Gateway antwortet nicht auf ARP: falsche Adresse, Router-Port aus</td></tr></table>"},
      {titel: "Auch ein Switch braucht eins", html:
        "<p>Ein Layer-2-Switch verhält sich bei seiner Verwaltungsadresse wie ein PC. Soll er aus anderen Netzen erreichbar sein, braucht er ein Gateway:</p>" +
        "<pre>SW1(config)# ip default-gateway 192.168.1.1</pre>"},
    ],
    merksatz: "Fremdes Netz? Dann geht der Frame an die MAC des Gateways, die IP bleibt die des Ziels.",
    pruefungstipp: "Frage „Welche Ziel-MAC hat der Frame an einen Internet-Server?“: die des Default Gateways.",
    quelle: "Network – Lernfassung",
    belege: "Fragen – Netzwerk-Grundlagen (net-15) · Netzwerk – Geschichten (Rita an der Grenze) · Cisco IOS Command Reference (ip default-gateway)",
    siehe: ["lab.netz", "lab.arp", "lab.route"],
  },
  "lab.arp": {
    titel: "ARP: IP zu MAC auflösen",
    kurz: "ARP findet im lokalen Netz zu einer IP-Adresse die MAC-Adresse, ohne die kein Frame adressiert werden kann.",
    abschnitte: [
      {titel: "Ablauf", html:
        "<ul><li>Absender schaut in seinen <b>ARP-Cache</b>. Kein Eintrag: Das Paket wartet.</li><li><b>ARP-Request als Broadcast</b> (Ziel-MAC ff:ff:ff:ff:ff:ff): „Wer hat 192.168.1.20? Sag es 192.168.1.10.“</li><li>Nur das gesuchte Gerät antwortet, per <b>Unicast</b>: „192.168.1.20 ist meine MAC.“</li><li>Der Absender trägt die Zuordnung ein, jetzt geht das eigentliche Paket los.</li></ul>" +
        "<p>ARP wird direkt in einem Ethernet-Frame transportiert (EtherType <code>0x0806</code>), ohne IP-Header.</p>"},
      {titel: "Ansehen", html:
        "<table><tr><th>Gerät</th><th>Befehl</th><th>Hinweis</th></tr>" +
        "<tr><td>Windows</td><td><code>arp -a</code></td><td>Cache anzeigen; <code>arp -d</code> leert ihn</td></tr>" +
        "<tr><td>Router</td><td><code>show ip arp</code></td><td><b>Echtes IOS</b> – das Labor kennt diesen Befehl nicht: „Incomplete“ heißt, es wurde gefragt und niemand hat geantwortet.</td></tr></table>"},
      {titel: "Sicherheit", html:
        "<p>ARP kennt keine Anmeldung, jeder darf antworten. Beim <b>ARP-Spoofing</b> gibt sich ein Angreifer als Gateway aus und liest mit. Abwehr: Dynamic ARP Inspection am Switch, VLANs, Verschlüsselung. Eine Firewall zwischen Netzen sieht diesen Verkehr im LAN gar nicht.</p>"},
      {titel: "IPv6: Nachbarschaft statt ARP (NDP)", html:
        "<p>In IPv6 gibt es kein ARP. Diese Aufgabe übernimmt das <b>Neighbor Discovery Protocol</b> (NDP) mit ICMPv6:</p>" +
        "<table><tr><th>Nachricht</th><th>Typ</th><th>Aufgabe</th></tr>" +
        "<tr><td>Router Solicitation</td><td>133</td><td>„Welche Router sind da?“ – der Rechner fragt beim Start</td></tr>" +
        "<tr><td>Router Advertisement</td><td>134</td><td>Der Router nennt Präfix, Gateway und Flags</td></tr>" +
        "<tr><td>Neighbor Solicitation</td><td>135</td><td>„Wer hat diese Adresse?“ – nicht an alle, sondern an eine Gruppe</td></tr>" +
        "<tr><td>Neighbor Advertisement</td><td>136</td><td>„Ich“ – die Antwort mit der MAC-Adresse</td></tr></table>" +
        "<p>Gefragt wird über die Multicast-Adresse <code>ff02::1:ffXX:XXXX</code>, gebildet aus den letzten 24 Bit der gesuchten Adresse (Solicited-Node). Auf Ethernet wird daraus die MAC <code>33:33:ff:XX:XX:XX</code> – nur die zuständigen Geräte hören mit, nicht das ganze Netz.</p>" +
        "<p>Vor der ersten Benutzung prüft jeder Rechner seine eigene Adresse per <b>Duplicate Address Detection</b>: eine Neighbor Solicitation an sich selbst. Antwortet jemand, ist die Adresse doppelt vergeben. Nachsehen: <code>show ipv6 neighbors</code> (IOS), <code>netsh interface ipv6 show neighbors</code> (Windows).</p>" +
        "<p><b>Echte Geräte, nicht das Labor:</b> Dieses Labor rechnet mit IPv4; IPv6 steht hier zum Nachschlagen. Es kennt keine IPv6-Konfiguration und weist beide Nachschlage-Befehle ab – auf echter IOS-Hardware und echtem Windows liefern sie die Nachbartabelle.</p>"},
    ],
    merksatz: "Request an alle (Broadcast), Reply an einen (Unicast).",
    pruefungstipp: "Liegt das Ziel in einem anderen Netz, fragt ARP nach der MAC des Gateways. Das ist die häufigste Prüfungsfalle zu ARP. In IPv6 übernimmt NDP diese Aufgabe mit ICMPv6.",
    quelle: "Network – Lernfassung",
    belege: "RFC 826 · Fragen – Netzwerk-Grundlagen (net-14 bis net-16) · RFC 4861 (Neighbor Discovery) · RFC 4862 (Duplicate Address Detection)",
    siehe: ["lab.gateway", "lab.switch", "lab.ping", "lab.ip"],
  },
  "lab.ping": {
    titel: "Ping und Fehlermeldungen lesen",
    kurz: "Ping schickt ICMP-Echo-Anfragen und zeigt, ob Antworten kommen, oder wer unterwegs einen Fehler meldet.",
    abschnitte: [
      {titel: "ICMP in Kürze", html:
        "<p>Ping nutzt <b>ICMP</b>, das direkt auf IP liegt, ohne TCP, UDP und Ports.</p>" +
        "<table><tr><th>Typ</th><th>Name</th><th>Bedeutung</th></tr>" +
        "<tr><td>8</td><td>Echo Request</td><td>die Anfrage</td></tr>" +
        "<tr><td>0</td><td>Echo Reply</td><td>die Antwort</td></tr>" +
        "<tr><td>3</td><td>Destination Unreachable</td><td>jemand meldet: Netz, Host oder Port nicht erreichbar</td></tr>" +
        "<tr><td>11</td><td>Time Exceeded</td><td>TTL unterwegs auf 0 gefallen</td></tr></table>"},
      {titel: "Ausgaben lesen", html:
        "<table><tr><th>IOS</th><th>Windows</th><th>Bedeutung</th></tr>" +
        "<tr><td><code>!</code></td><td>Antwort von …</td><td>Antwort erhalten</td></tr>" +
        "<tr><td><code>.</code></td><td>Zeitüberschreitung der Anforderung.</td><td>still verworfen, niemand meldet sich</td></tr>" +
        "<tr><td><code>U</code></td><td>Zielhost/Zielnetz nicht erreichbar.</td><td>ein Gerät meldet den Fehler</td></tr>" +
        "<tr><td><code>&amp;</code></td><td>Gültigkeitsdauer … überschritten.</td><td>TTL abgelaufen</td></tr></table>" +
        "<p>IOS sendet standardmäßig 5 Anfragen und wartet je 2 s, Windows sendet 4 und wartet je 4 s.</p>"},
      {titel: "Timeout oder Unreachable?", html:
        "<p><b>Unreachable</b> ist die freundlichere Nachricht: Die Adresse hinter „Antwort von“ zeigt, wer aufgegeben hat. Kommt sie von der eigenen Adresse, blieb ARP im eigenen Netz ohne Antwort. Ein <b>Timeout</b> sagt nur, dass nichts zurückkam: Firewall, fehlende Rückroute, fehlendes NAT.</p>" +
        "<p><code>.!!!!</code> beim ersten Ping über einen Router ist normal: Das erste Paket geht verloren, während ARP noch auflöst.</p>"},
    ],
    merksatz: "Timeout = still verworfen, Unreachable = jemand meldet sich.",
    pruefungstipp: "Ping hat keinen Port: ICMP liegt direkt auf Schicht 3.",
    quelle: "Network – Lernfassung",
    belege: "RFC 792 · Cisco: Understanding the Ping and Traceroute Commands · Microsoft Learn: ping",
    siehe: ["lab.ttl", "lab.arp", "lab.route"],
  },
  "lab.switch": {
    titel: "Switch: MAC-Tabelle und Fluten",
    kurz: "Ein Switch lernt aus den Quell-MACs, an welchem Port welches Gerät hängt, und leitet Frames gezielt weiter.",
    abschnitte: [
      {titel: "Vier Entscheidungen", html:
        "<ul><li><b>Lernen</b>: Quell-MAC und Eingangsport in die MAC-Tabelle eintragen, immer über die Quell-MAC.</li><li><b>Weiterleiten</b>: Ziel-MAC bekannt, nur an diesen Port.</li><li><b>Fluten</b>: Ziel unbekannt oder Broadcast, an alle Ports außer dem Eingang (im selben VLAN).</li><li><b>Filtern</b>: Ziel hängt am Eingangsport, der Frame wird nicht weitergeleitet.</li></ul>" +
        "<p>Einträge verfallen nach 300 s ohne Verkehr (Cisco-Standard).</p>"},
      {titel: "Ansehen", html:
        "<pre>SW1# show mac address-table\nVlan  Mac Address     Type     Ports\n   1  0060.2f3a.1b01  DYNAMIC  Fa0/1</pre>"},
      {titel: "Domänen", html:
        "<table><tr><th>Gerät</th><th>Kollisionsdomänen</th><th>Broadcast-Domänen</th></tr>" +
        "<tr><td>Hub</td><td>eine für alle Ports</td><td>eine</td></tr>" +
        "<tr><td>Switch</td><td>eine je Port</td><td>eine (je VLAN eine)</td></tr>" +
        "<tr><td>Router</td><td>eine je Schnittstelle</td><td>eine je Schnittstelle</td></tr></table>"},
    ],
    merksatz: "Lernen über die Quelle, entscheiden über das Ziel.",
    pruefungstipp: "Domänen zählen: Jede Switch-Leitung ist eine eigene Kollisionsdomäne, Broadcasts stoppt nur der Router (oder die VLAN-Grenze).",
    quelle: "Network – Lernfassung",
    belege: "Fragen – Netzwerk-Grundlagen (net-04 bis net-07) · Cisco Catalyst Command Reference (show mac address-table)",
    siehe: ["lab.arp", "lab.vlan", "lab.portsec"],
  },
  "lab.subnetz": {
    titel: "Adressplan und Subnetting",
    kurz: "Subnetting teilt einen Adressbereich in passende Netze; gerechnet wird mit Blockgröße, Netz-ID und Broadcast.",
    abschnitte: [
      {titel: "Der Rechenweg in fünf Schritten", html:
        "<ul><li>Oktett finden, in dem die Maske nicht 255 ist.</li><li>Blockgröße = 256 − Maskenwert in diesem Oktett.</li><li>Netz-ID = größtes Vielfaches der Blockgröße, das nicht über dem Wert liegt.</li><li>Broadcast = nächste Netz-ID − 1.</li><li>Nutzbare Hosts = 2<sup>Hostbits</sup> − 2.</li></ul>"},
      {titel: "Masken-Tabelle", html:
        "<table><tr><th>Präfix</th><th>Maske (letztes Oktett)</th><th>Block</th><th>Hosts</th></tr>" +
        "<tr><td>/24</td><td>0</td><td>256</td><td>254</td></tr>" +
        "<tr><td>/25</td><td>128</td><td>128</td><td>126</td></tr>" +
        "<tr><td>/26</td><td>192</td><td>64</td><td>62</td></tr>" +
        "<tr><td>/27</td><td>224</td><td>32</td><td>30</td></tr>" +
        "<tr><td>/28</td><td>240</td><td>16</td><td>14</td></tr>" +
        "<tr><td>/29</td><td>248</td><td>8</td><td>6</td></tr>" +
        "<tr><td>/30</td><td>252</td><td>4</td><td>2</td></tr></table>"},
      {titel: "Präfix zur Hostzahl und VLSM", html:
        "<p>Gesucht ist das kleinste h mit 2<sup>h</sup> − 2 ≥ Hosts, Präfix = 32 − h. 50 Hosts: h = 6, also /26. 63 Hosts passen <b>nicht</b> in /26 (nur 62), also /25.</p>" +
        "<p><b>VLSM</b>: größtes Netz zuerst vergeben, dann absteigend. Beispiel 10.0.0.0/22: Verwaltung 500 Hosts = 10.0.0.0/23, Produktion 250 = 10.0.2.0/24, Gäste 100 = 10.0.3.0/25, Server 50 = 10.0.3.128/26.</p>"},
      {titel: "IPv6: Präfixe planen und rechnen (Nachschlagen)", html:
        "<p>In IPv6 plant man mit Präfixlängen statt mit Masken. Übliche Vorgaben: <b>/48</b> je Standort, <b>/56</b> für kleine Standorte, <b>/64</b> je LAN. Aus einem /48 werden 65536 /64-Netze – genug für jedes VLAN und jedes Gästenetz.</p>" +
        "<p>Gerechnet wird im Hexadezimalblock, am einfachsten an Nibble-Grenzen (je 4 Bit): /52, /56, /60 und /64 teilen eine Gruppe sauber. Beispiel 2001:db8:aa00::/48:</p>" +
        "<table><tr><th>Netz</th><th>Verwendung</th></tr>" +
        "<tr><td>2001:db8:aa00:0000::/64</td><td>Verwaltung</td></tr>" +
        "<tr><td>2001:db8:aa00:0001::/64</td><td>Behandlung</td></tr>" +
        "<tr><td>2001:db8:aa00:0002::/64</td><td>Gäste</td></tr>" +
        "<tr><td>2001:db8:aa00:00ff::/64</td><td>Reserve, zum Beispiel für Server</td></tr></table>" +
        "<p>Ein /64 hat 64 Hostbits; die Netz-ID liest man aus den ersten vier Blöcken, statt sie auszurechnen. Sonderadressen wie Netz-ID und Broadcast gibt es nicht – jedes Präfix stellt seine Adressen den Geräten zur Verfügung, die letzten 64 Bit sind die Interface-ID. Nur die Interface-ID aus lauter Nullen ist als Subnet-Router-Anycast reserviert (RFC 4291) und wird keinem Gerät gegeben.</p>" +
        "<p><b>Rezept:</b> Standort-Präfix (/48) vom Provider oder aus dem Unique-Local-Bereich nehmen, VLANs nummerieren (VLAN 10 wird Netz 000a), je VLAN ein /64 vergeben, die Router-Advertisements daraus speisen und die Vergabe dokumentieren.</p>" +
        "<p>Ein LAN-Präfix, das nicht /64 lang ist – kürzer wie /48 oder länger wie /80 – bricht SLAAC und einzelne Dienste; deshalb bleibt /64 die Regel. Dieses Labor rechnet mit IPv4; IPv6 steht hier zum Nachschlagen.</p>"},
    ],
    merksatz: "Blockgröße = 256 − Maske; Netz-ID auf dem Pfahl davor, Broadcast kurz vor dem nächsten.",
    pruefungstipp: "Rechenweg hinschreiben (Präfix, Maske, Block, Netz, Broadcast, Hosts). Bei VLSM den Restbereich nennen, das gibt Zusatzpunkte. In IPv6: /48 je Standort, /64 je LAN.",
    quelle: "04-AP1-Netzwerk",
    belege: "07-Uebungen-Subnetting-Szenarien · Fragen – Subnetting · Network – Lernfassung (§ 8) · RFC 4291 (IPv6-Adressarchitektur) · RFC 4862 (SLAAC braucht /64) · RFC 4193 (Unique Local)",
    siehe: ["lab.netz", "lab.ip", "lab.vlan"],
  },
  "lab.dhcp": {
    titel: "DHCP (DORA, Pool, Relay)",
    kurz: "DHCP verteilt IP-Adresse, Maske, Gateway und DNS-Server automatisch, in vier Schritten: Discover, Offer, Request, Acknowledge.",
    abschnitte: [
      {titel: "DORA", html:
        "<ul><li><b>Discover</b> (Broadcast, Absender 0.0.0.0): „Gibt es hier einen DHCP-Server?“</li><li><b>Offer</b>: Der Server bietet eine Adresse an.</li><li><b>Request</b> (noch Broadcast): „Ich nehme sie“, so erfahren andere Server, dass ihr Angebot abgelehnt ist.</li><li><b>Acknowledge</b>: Bestätigung samt Leasedauer, Gateway und DNS.</li></ul>" +
        "<p>Ports: Server UDP 67, Client UDP 68. Antwortet niemand, vergibt sich Windows eine APIPA-Adresse aus 169.254.0.0/16.</p>"},
      {titel: "DHCP-Server am Router", html:
        "<pre>R1(config)# ip dhcp excluded-address 192.168.10.1 192.168.10.9\nR1(config)# ip dhcp pool LAN\nR1(dhcp-config)# network 192.168.10.0 255.255.255.0\nR1(dhcp-config)# default-router 192.168.10.1\nR1(dhcp-config)# dns-server 192.168.10.5</pre>" +
        "<p>Ausgeschlossene Adressen bleiben für Router, Server und Drucker. Kontrolle: <code>show ip dhcp binding</code>.</p>"},
      {titel: "Relay über Router hinweg", html:
        "<p>Broadcasts enden am Router. Steht der DHCP-Server in einem anderen Netz oder VLAN, leitet das Gateway der Clients die Anfragen gezielt weiter:</p>" +
        "<pre>R1(config)# interface g0/0.20\nR1(config-subif)# ip helper-address 192.168.10.5</pre>" +
        "<p>Am Client: <code>ipconfig /release</code>, <code>ipconfig /renew</code>, <code>ipconfig /all</code>.</p>"},
      {titel: "IPv6: SLAAC, Router Advertisement und DHCPv6 (Nachschlagen)", html:
        "<p>In IPv6 muss kein Server Adressen verteilen. Ein Router im Netz verschickt regelmäßig <b>Router Advertisements</b> (ICMPv6 Typ 134) mit dem Präfix; daraus bildet sich ein Rechner seine Adresse selbst. Das heißt <b>SLAAC</b>.</p>" +
        "<table><tr><th>Weg</th><th>Wie</th></tr>" +
        "<tr><td>SLAAC</td><td>Präfix aus dem Router Advertisement plus Interface-ID, gebildet aus der MAC oder zufällig</td></tr>" +
        "<tr><td>DHCPv6 mit Adresse</td><td>Setzt der Router das M-Flag, holt der Client die Adresse vom Server</td></tr>" +
        "<tr><td>DHCPv6 ohne Adresse</td><td>Setzt er nur das O-Flag, kommt die Adresse aus SLAAC und DHCPv6 liefert Zusatzangaben wie den DNS-Server</td></tr></table>" +
        "<p>DHCPv6 nutzt UDP 546 am Client und UDP 547 am Server. Statt Discover, Offer, Request, Acknowledge heißen die Nachrichten Solicit, Advertise, Request, Reply.</p>" +
        "<pre>R1(config)# ipv6 unicast-routing\nR1(config)# interface g0/0\nR1(config-if)# ipv6 address 2001:db8:aa00:1::1/64\nR1(config-if)# no shutdown</pre>" +
        "<p><b>Echtes IOS, nicht das Labor:</b> <code>ipv6 unicast-routing</code> und <code>ipv6 address</code> gehören auf echte Router; das Labor kennt keine IPv6-Konfiguration und weist beide Befehle ab.</p>" +
        "<p>Ohne <b>ipv6 unicast-routing</b> verschickt ein Router keine Router Advertisements, dann bleibt den Clients nur die Link-Local-Adresse. Am Provider holt sich ein Router sein Präfix per <b>DHCPv6-Prefix-Delegation</b>. Dieses Labor rechnet mit IPv4; IPv6 steht hier zum Nachschlagen.</p>"},
    ],
    merksatz: "169.254.x.x heißt: DHCP hat nicht geantwortet. Kabel, VLAN, Dienst und Relay prüfen.",
    pruefungstipp: "DORA in der richtigen Reihenfolge, Ports 67/68 und die Bedeutung von APIPA sind Dauerbrenner. In IPv6: SLAAC aus dem Router Advertisement, DHCPv6 nur bei gesetztem M- oder O-Flag.",
    quelle: "Network – Lernfassung",
    belege: "RFC 2131 · RFC 3927 · Cisco IOS DHCP Server Configuration Guide · Fragen – Netzwerk-Grundlagen (net-13, net-17) · RFC 4861 (Router Advertisement) · RFC 4862 (SLAAC) · RFC 8415 (DHCPv6) · Cisco IOS IPv6 Addressing and Basic Connectivity Configuration Guide",
    siehe: ["lab.ip", "lab.rostick", "lab.dns"],
  },
  "lab.dns": {
    titel: "DNS-Namensauflösung",
    kurz: "DNS übersetzt Namen wie server.praxis.local in IP-Adressen, meist per UDP auf Port 53.",
    abschnitte: [
      {titel: "Wie ein Name aufgelöst wird", html:
        "<ul><li>Client schaut in seinen Cache und die hosts-Datei.</li><li>Client fragt seinen eingetragenen DNS-Server (Resolver).</li><li>Der Resolver fragt sich durch: Root-Server, dann TLD-Server (.de), dann den zuständigen (autoritativen) Server.</li><li>Die Antwort wird zwischengespeichert.</li></ul>" +
        "<p>Normale Anfragen laufen über <b>UDP 53</b>, große Antworten über TCP 53.</p>"},
      {titel: "Fehlersuche", html:
        "<table><tr><th>Test</th><th>Ergebnis</th><th>Schluss</th></tr>" +
        "<tr><td>ping per IP</td><td>geht</td><td>Netz in Ordnung</td></tr>" +
        "<tr><td>ping per Name</td><td>„konnte Host … nicht finden“</td><td>DNS-Problem</td></tr>" +
        "<tr><td><code>nslookup name</code></td><td>„Non-existent domain“</td><td>Server erreicht, Eintrag fehlt</td></tr>" +
        "<tr><td><code>ipconfig /all</code></td><td>DNS-Server leer oder extern</td><td>falscher oder kein DNS-Server</td></tr></table>" +
        "<p>Interne Namen kennt nur der interne DNS-Server. Trägt ein PC einen externen DNS-Server ein, gehen Webseiten, aber das Intranet nicht.</p>"},
      {titel: "Eintragstypen und Zonen", html:
        "<table><tr><th>Typ</th><th>Inhalt</th><th>wofür</th></tr>" +
        "<tr><td>A</td><td>IPv4-Adresse</td><td>Name zu Rechner</td></tr>" +
        "<tr><td>AAAA</td><td>IPv6-Adresse</td><td>dasselbe für IPv6</td></tr>" +
        "<tr><td>CNAME</td><td>anderer Name</td><td>Alias, zum Beispiel www auf den Server</td></tr>" +
        "<tr><td>MX</td><td>Mailserver mit Priorität</td><td>Zustellung von E-Mail</td></tr>" +
        "<tr><td>NS</td><td>zuständiger Nameserver</td><td>Delegation einer Zone</td></tr>" +
        "<tr><td>PTR</td><td>Name zur Adresse</td><td>Rückwärtssuche</td></tr>" +
        "<tr><td>TXT</td><td>freier Text</td><td>Nachweise, zum Beispiel SPF für Mail</td></tr></table>" +
        "<p>Derselbe Name darf mehrere A- und AAAA-Einträge haben – der Client nimmt einen erreichbaren. Die Rückwärtssuche läuft über eigene Zonen: <code>in-addr.arpa</code> für IPv4, <code>ip6.arpa</code> für IPv6; dort stehen PTR-Einträge.</p>"},
      {titel: "Cache, TTL und Zonenrand", html:
        "<p>Jeder Eintrag trägt eine <b>TTL</b> in Sekunden: So lange darf ein Resolver die Antwort behalten. Kurze Werte (300 s) helfen vor einem Umzug, lange Werte (86400 s) sparen Anfragen.</p>" +
        "<p>Ein Server ist nur für seine Zone <b>autoritativ</b>; für alles andere fragt er weiter. Deshalb dauert es nach einer Änderung, bis sie überall ankommt – der alte Eintrag liegt noch im Cache. Nachsehen mit <code>nslookup name</code> oder <code>dig</code>; auf echten Systemen fragt <code>nslookup -type=AAAA name</code> gezielt nach IPv6-Adressen – das Labor kennt nur die einfache Form.</p>"},
    ],
    merksatz: "Per IP geht, per Name nicht: Es ist DNS.",
    pruefungstipp: "DNS ist der erste Diagnosepunkt, wenn „der Server nicht erreichbar“ ist. Erst IP testen, dann Namen.",
    quelle: "Network – Lernfassung",
    belege: "RFC 1034 · RFC 1035 · Fragen – Netzwerk-Grundlagen (net-18, net-21) · 05-AP2-Infrastruktur-Sicherheit (Serverdienste) · RFC 3596 (AAAA und ip6.arpa)",
    siehe: ["lab.dhcp", "lab.ports", "lab.ping"],
  },
  "lab.ports": {
    titel: "Ports und Dienste (TCP/UDP)",
    kurz: "Ports sind die Adressen auf Schicht 4: Sie sagen, welcher Dienst in einem Rechner gemeint ist.",
    abschnitte: [
      {titel: "Port ist nicht gleich Port", html:
        "<p><b>Fa0/3</b> ist eine Buchse am Switch (Schicht 1/2). <b>443</b> ist eine 16-Bit-Nummer für einen Dienst (Schicht 4). IP-Adresse plus Port heißt <b>Socket</b>. Einen Port öffnet die Anwendung, die auf ihm lauscht.</p>" +
        "<table><tr><th>Bereich</th><th>Name</th></tr><tr><td>0 bis 1023</td><td>Well-known</td></tr><tr><td>1024 bis 49151</td><td>Registered</td></tr><tr><td>49152 bis 65535</td><td>Dynamic (Client-Seite)</td></tr></table>"},
      {titel: "Wichtige Ports", html:
        "<table><tr><th>Port</th><th>Dienst</th><th>Port</th><th>Dienst</th></tr>" +
        "<tr><td>20/21</td><td>FTP</td><td>110/995</td><td>POP3/POP3S</td></tr>" +
        "<tr><td>22</td><td>SSH</td><td>143/993</td><td>IMAP/IMAPS</td></tr>" +
        "<tr><td>25, 587</td><td>SMTP</td><td>443</td><td>HTTPS</td></tr>" +
        "<tr><td>53</td><td>DNS</td><td>445</td><td>SMB (Dateifreigabe)</td></tr>" +
        "<tr><td>67/68</td><td>DHCP</td><td>3389</td><td>RDP</td></tr>" +
        "<tr><td>80</td><td>HTTP</td><td>9100</td><td>Druck (RAW)</td></tr></table>"},
      {titel: "Erreichbar, aber der Dienst nicht", html:
        "<p>Ping klappt, die Verbindung nicht? Dann antwortet der Server auf einen geschlossenen TCP-Port mit <b>RST</b> (Verbindung abgelehnt). Prüf die Portnummer und ob der Dienst unter „Dienste“ eingeschaltet ist. Kommt gar keine Antwort, filtert eher eine Firewall.</p>"},
    ],
    merksatz: "Die IP-Adresse findet den Rechner, der Port findet den Dienst.",
    pruefungstipp: "Portliste auswendig, mit Richtung: SMTP sendet (25/587), POP3 und IMAP holen ab.",
    quelle: "04-AP1-Netzwerk",
    belege: "Fragen – Netzwerk-Grundlagen (net-22 bis net-34) · VLAN – Visuelle Lernnotiz (§ 1) · IANA Service Name and Port Number Registry",
    siehe: ["lab.tcp", "lab.fw", "lab.portfwd"],
  },
  "lab.tcp": {
    titel: "TCP-Handshake",
    kurz: "TCP baut vor dem Senden eine Verbindung auf (SYN, SYN/ACK, ACK), nummeriert jedes Byte und bestätigt lückenlos.",
    abschnitte: [
      {titel: "Aufbau mit Nummern", html:
        "<table><tr><th>Richtung</th><th>Flags</th><th>Seq</th><th>Ack</th></tr>" +
        "<tr><td>Client → Server</td><td>SYN</td><td>5000</td><td>–</td></tr>" +
        "<tr><td>Server → Client</td><td>SYN, ACK</td><td>9000</td><td>5001</td></tr>" +
        "<tr><td>Client → Server</td><td>ACK</td><td>5001</td><td>9001</td></tr></table>" +
        "<p>SYN und FIN belegen je eine Sequenznummer, deshalb ist Ack = Seq + 1.</p>"},
      {titel: "Bytes statt Segmente", html:
        "<ul><li><b>Seq</b> = Nummer des ersten Bytes im Segment.</li><li><b>Ack</b> = nächstes erwartetes Byte, kumulativ: Ack 6001 heißt „bis 6000 alles lückenlos da“.</li><li>Fehlt ein Segment, bleibt das Ack an der Lücke stehen; nach drei doppelten Acks sendet der Sender sofort neu.</li></ul>"},
      {titel: "Ende und Abbruch", html:
        "<p><b>FIN</b> setzt der Sender einer Richtung, wenn er nichts mehr senden will; Abbau mit FIN, ACK, FIN, ACK. <b>RST</b> ist kein geordneter Abbau, sondern ein Abbruch, zum Beispiel als Antwort auf einen geschlossenen Port.</p>"},
    ],
    merksatz: "SYN, SYN/ACK, ACK: erst anklopfen, dann reden.",
    pruefungstipp: "Ack ist das nächste erwartete Byte, nicht das zuletzt empfangene.",
    quelle: "TCP – Lernfassung",
    belege: "RFC 9293 · RFC 5681 (Fast Retransmit) · Fragen – Netzwerk-Grundlagen (net-42 bis net-49)",
    siehe: ["lab.ports", "lab.fw"],
  },
  "lab.cli": {
    titel: "IOS-Konsole: Modi und Grundbefehle",
    kurz: "Die Konsole von Router und Switch arbeitet in Modi; der Prompt zeigt dir immer, wo du gerade bist.",
    abschnitte: [
      {titel: "Modi und Prompts", html:
        "<table><tr><th>Prompt</th><th>Modus</th><th>Hinein mit</th></tr>" +
        "<tr><td><code>R1&gt;</code></td><td>Benutzermodus (nur ansehen)</td><td>Anmelden</td></tr>" +
        "<tr><td><code>R1#</code></td><td>Privilegierter Modus</td><td><code>enable</code></td></tr>" +
        "<tr><td><code>R1(config)#</code></td><td>Globale Konfiguration</td><td><code>configure terminal</code></td></tr>" +
        "<tr><td><code>R1(config-if)#</code></td><td>Schnittstelle</td><td><code>interface g0/0</code></td></tr>" +
        "<tr><td><code>R1(config-subif)#</code></td><td>Unterschnittstelle</td><td><code>interface g0/0.10</code></td></tr>" +
        "<tr><td><code>SW1(config-vlan)#</code></td><td>VLAN</td><td><code>vlan 10</code></td></tr></table>" +
        "<p><code>exit</code> geht eine Ebene zurück, <code>end</code> direkt in den privilegierten Modus.</p>"},
      {titel: "Bedienung", html:
        "<ul><li><b>Abkürzen</b>, solange eindeutig: <code>sh ip int br</code> = <code>show ip interface brief</code>.</li><li><b>?</b> zeigt die möglichen Wörter an dieser Stelle, <b>Tab</b> vervollständigt.</li><li><b>no</b> vor einem Befehl nimmt ihn zurück: <code>no shutdown</code>.</li><li><b>do</b> führt im Konfigurationsmodus einen show-Befehl aus: <code>do show ip route</code>.</li></ul>"},
      {titel: "Fehlermeldungen", html:
        "<table><tr><th>Meldung</th><th>Bedeutung</th></tr>" +
        "<tr><td>% Invalid input detected at '^' marker.</td><td>Tippfehler oder falscher Modus; das ^ zeigt die Stelle</td></tr>" +
        "<tr><td>% Incomplete command.</td><td>Es fehlt noch etwas, zum Beispiel die Maske</td></tr>" +
        "<tr><td>% Ambiguous command: \"…\"</td><td>Abkürzung passt auf mehrere Befehle</td></tr></table>"},
    ],
    merksatz: "Erst den Prompt lesen, dann tippen.",
    pruefungstipp: "Befehle in der Prüfung mit Modus angeben, zum Beispiel „im Schnittstellenmodus: ip address …“.",
    quelle: "VLAN – Lernfassung",
    belege: "Cisco IOS Configuration Fundamentals Configuration Guide: Using the Command-Line Interface",
    siehe: ["lab.speichern", "lab.link", "lab.vlan"],
  },
  "lab.speichern": {
    titel: "running- und startup-config",
    kurz: "Änderungen gelten sofort, sind aber nur im RAM; erst das Speichern schreibt sie dauerhaft in den NVRAM.",
    abschnitte: [
      {titel: "Wo was liegt", html:
        "<table><tr><th>Speicher</th><th>Inhalt</th><th>nach Stromausfall</th></tr>" +
        "<tr><td>RAM</td><td>running-config: was gerade gilt</td><td>weg</td></tr>" +
        "<tr><td>NVRAM</td><td>startup-config: wird beim Start geladen</td><td>bleibt</td></tr>" +
        "<tr><td>Flash</td><td>Betriebssystem, beim Switch die VLAN-Datenbank vlan.dat</td><td>bleibt</td></tr></table>"},
      {titel: "Befehle", html:
        "<pre>R1# copy running-config startup-config\nDestination filename [startup-config]?   ← Enter\nR1# write memory\nR1# show startup-config\nR1# reload</pre>" +
        "<p><code>copy running-config startup-config</code> und <code>write memory</code> tun dasselbe. Im Labor fragt der Router nach dem Zielnamen – <b>Enter</b> bestätigt ihn; wer stattdessen den nächsten Befehl tippt, beantwortet damit die Rückfrage und bekommt eine Fehlermeldung. Auch <code>reload</code> fragt nach: ungesicherte Änderungen speichern? Wer vor dem Stromausfall nicht gespeichert hat, startet mit der alten startup-config.</p>"},
      {titel: "Zurücksetzen und die VLAN-Falle", html:
        "<p><code>erase startup-config</code> (oder <code>write erase</code>) löscht nur die startup-config. Die VLANs eines Switches stehen aber in <code>flash:vlan.dat</code> und überleben das. Vollständig zurücksetzen:</p>" +
        "<pre>SW1# erase startup-config\nSW1# delete flash:vlan.dat\nSW1# reload</pre>" +
        "<p>Bei gebrauchten Geräten deshalb immer auch vlan.dat prüfen (<code>show flash:</code>).</p>"},
    ],
    merksatz: "Nicht gespeichert heißt: beim nächsten Neustart vergessen.",
    pruefungstipp: "RAM, NVRAM und Flash sauber zuordnen können; running = RAM, startup = NVRAM.",
    quelle: "Netzwerk 29.09",
    belege: "Cisco IOS Configuration Fundamentals Configuration Guide (Managing Configuration Files) · Cisco Catalyst Software Configuration Guide: Configuring VLANs (vlan.dat)",
    siehe: ["lab.cli", "lab.vlan"],
  },
  "lab.vlan": {
    titel: "VLANs und Access-Ports",
    kurz: "Ein VLAN teilt einen Switch in mehrere logische Switches; jedes VLAN ist eine eigene Broadcast-Domäne und bekommt ein eigenes IP-Netz.",
    abschnitte: [
      {titel: "Wozu", html:
        "<ul><li><b>Sicherheit</b>: Abteilungen und Gäste getrennt, Übergänge nur über Router oder Firewall mit Regeln.</li><li><b>Weniger Broadcasts</b>: Eine Durchsage erreicht nur das eigene VLAN.</li><li><b>Ordnung</b>: Ein Umzug ist eine Portänderung, kein Umstecken.</li></ul>"},
      {titel: "Einrichten in drei Schritten", html:
        "<pre>SW1(config)# vlan 10\nSW1(config-vlan)# name Verwaltung\nSW1(config)# interface fa0/1\nSW1(config-if)# switchport mode access\nSW1(config-if)# switchport access vlan 10</pre>" +
        "<p>Kontrolle mit <code>show vlan brief</code>: Welche Ports stecken in welchem VLAN? Ein Access-Port gehört zu genau einem VLAN, Frames laufen dort ohne Tag.</p>"},
      {titel: "VLAN 1 und der Weg zwischen VLANs", html:
        "<p>Ab Werk steckt jeder Port in <b>VLAN 1</b> (Default VLAN). Ein Port, den du vergessen hast, bleibt also im VLAN 1. Zwischen zwei VLANs gibt es nur einen Weg: über <b>Schicht 3</b>, also einen Router (Router-on-a-Stick) oder einen Layer-3-Switch.</p>"},
      {titel: "WLAN und VLAN: eine SSID, ein Netz", html:
        "<p>Jede SSID gehört zu genau einem VLAN. Der Access Point taggt die Frames seiner Funknetze und schiebt sie über einen <b>Trunk</b> zum Switch: Für den Switch ist der AP ein Gerät mit mehreren VLANs, für den Funkclient ist seine SSID ein Access-Port.</p>" +
        "<pre>SW1(config)# interface g0/2\nSW1(config-if)# switchport mode trunk\nSW1(config-if)# switchport trunk allowed vlan 10,20,30</pre>" +
        "<ul><li><b>Gästenetz</b>: eigene SSID im eigenen VLAN und eigenen IP-Bereich, Übergang nur ins Internet – nie ins Verwaltungsnetz.</li><li><b>Management</b>: eigenes VLAN für die APs selbst; die Verwaltungsoberfläche gehört nicht ins Gästenetz.</li><li><b>Ein IP-Netz je VLAN</b>: Jede SSID bekommt ihren eigenen Adressbereich und ihr eigenes Gateway – genau wie eine Abteilung am Kabel.</li><li><b>Mehrere APs, eine SSID</b>: Geräte wechseln die Zelle, wenn die Feldstärke nachlässt (Roaming). Damit das ohne Adresswechsel klappt, hängen alle APs im selben VLAN.</li></ul>" +
        "<p>Größere Anlagen steuert ein <b>WLAN-Controller</b>: Er verteilt SSIDs und Kanäle an alle APs. Ob der Datenverkehr am AP lokal ins Kabel geht oder gebündelt über den Controller läuft, hängt von der Betriebsart ab; im lokalen Betrieb bleibt die Trennung der Netze am Switch.</p>"},
    ],
    merksatz: "Ein VLAN = eine Broadcast-Domäne = ein IP-Netz.",
    pruefungstipp: "Kommunikation zwischen VLANs braucht immer einen Router oder Layer-3-Switch, das ist eine klassische AP-Frage. Im WLAN gilt dasselbe: eine SSID, ein VLAN, ein IP-Netz.",
    quelle: "VLAN – Lernfassung",
    belege: "VLAN – Visuelle Lernnotiz · IEEE 802.1Q · Fragen – Netzwerke planen (nwp-01 bis nwp-03) · IEEE 802.11 (SSID und Funkzelle) · BSI IT-Grundschutz-Kompendium, NET.2.1 WLAN-Betrieb",
    siehe: ["lab.trunk", "lab.rostick", "lab.switch", "lab.link"],
  },
  "lab.trunk": {
    titel: "Trunk und 802.1Q",
    kurz: "Ein Trunk ist eine Verbindung, die Frames mehrerer VLANs transportiert und sie dafür mit einem 802.1Q-Tag markiert.",
    abschnitte: [
      {titel: "Der Tag", html:
        "<p>4 Byte, eingefügt zwischen Quell-MAC und EtherType:</p>" +
        "<table><tr><th>Feld</th><th>Bit</th><th>Inhalt</th></tr><tr><td>TPID</td><td>16</td><td>0x8100, kündigt den Tag an</td></tr><tr><td>PCP</td><td>3</td><td>Priorität</td></tr><tr><td>DEI</td><td>1</td><td>darf bei Überlast verworfen werden</td></tr><tr><td>VID</td><td>12</td><td>VLAN-Nummer, 1 bis 4094</td></tr></table>"},
      {titel: "Einrichten und prüfen", html:
        "<pre>SW1(config)# interface g0/1\nSW1(config-if)# switchport mode trunk\nSW1(config-if)# switchport trunk allowed vlan 10,20,30\nSW1(config-if)# switchport trunk native vlan 99</pre>" +
        "<p><code>show interfaces trunk</code> zeigt Trunks, Native VLAN und erlaubte VLANs. Auf echter Hardware schaltet zusätzlich <code>switchport nonegotiate</code> das Aushandeln ab – das Labor kennt dieses Kommando nicht und weist es ab.</p>"},
      {titel: "Die drei Fallen", html:
        "<ul><li><code>switchport trunk allowed vlan 40</code> <b>ersetzt</b> die Liste. Ergänzen geht mit <code>switchport trunk allowed vlan add 40</code>.</li><li>Das <b>Native VLAN</b> läuft ohne Tag und muss auf beiden Seiten gleich sein, sonst laufen zwei VLANs ineinander.</li><li>Endgeräte gehören an Access-Ports: Am Trunk könnten sie selbst Tags setzen und in fremde VLANs senden.</li></ul>"},
    ],
    merksatz: "Native = nackt: das VLAN ohne Tag auf dem Trunk.",
    pruefungstipp: "Tag 4 Byte, VLAN-ID 12 Bit: zwei verschiedene Fragen, zwei verschiedene Antworten.",
    quelle: "VLAN – Lernfassung",
    belege: "IEEE 802.1Q · VLAN – Visuelle Lernnotiz (§ 5, § 8) · Cisco Catalyst Software Configuration Guide: Configuring VLAN Trunks",
    siehe: ["lab.vlan", "lab.rostick"],
  },
  "lab.rostick": {
    titel: "Router-on-a-Stick",
    kurz: "Ein Router verbindet mehrere VLANs über eine einzige Leitung: ein Trunk, eine Unterschnittstelle je VLAN.",
    abschnitte: [
      {titel: "Aufbau", html:
        "<ul><li>Switchport zum Router: <b>Trunk</b>.</li><li>Router: physische Schnittstelle einschalten, keine IP darauf.</li><li>Je VLAN eine <b>Unterschnittstelle</b> mit Tag-Nummer und IP. Diese IP ist das <b>Gateway</b> der PCs in diesem VLAN.</li></ul>"},
      {titel: "Konfiguration", html:
        "<pre>R1(config)# interface g0/0\nR1(config-if)# no shutdown\nR1(config)# interface g0/0.10\nR1(config-subif)# encapsulation dot1Q 10\nR1(config-subif)# ip address 192.168.10.1 255.255.255.0\nR1(config)# interface g0/0.20\nR1(config-subif)# encapsulation dot1Q 20\nR1(config-subif)# ip address 192.168.20.1 255.255.255.0</pre>" +
        "<p>Reihenfolge beachten: erst <code>encapsulation dot1Q</code>, dann die IP-Adresse. Die Zahl hinter <code>dot1Q</code> muss zur VLAN-Nummer passen, die Nummer hinter dem Punkt ist nur ein Name.</p>"},
      {titel: "Typische Fehler", html:
        "<table><tr><th>Fehler</th><th>Folge</th></tr>" +
        "<tr><td>Switchport zum Router ist Access</td><td>keine getaggten Frames, die VLANs erreichen den Router nicht</td></tr>" +
        "<tr><td>falsche Zahl bei encapsulation dot1Q</td><td>dieses VLAN erreicht sein Gateway nicht</td></tr>" +
        "<tr><td>physische Schnittstelle shutdown</td><td>alle Unterschnittstellen sind mit aus</td></tr>" +
        "<tr><td>VLAN auf dem Trunk nicht erlaubt</td><td>nur dieses VLAN bleibt stumm</td></tr></table>"},
    ],
    merksatz: "Eine Leitung, viele VLANs: Trunk am Switch, Unterschnittstellen am Router.",
    pruefungstipp: "Als Alternative immer den Layer-3-Switch nennen können.",
    quelle: "VLAN – Visuelle Lernnotiz",
    belege: "VLAN – Lernfassung (§ 1 Korrektur 6) · Cisco IOS: Configuring Routing Between VLANs with IEEE 802.1Q Encapsulation",
    siehe: ["lab.trunk", "lab.vlan", "lab.gateway", "lab.acl"],
  },
  "lab.acl": {
    titel: "Access-Listen (ACL)",
    kurz: "Eine ACL ist eine Regelliste am Router, die Pakete nach Adresse, Protokoll und Port erlaubt oder verwirft.",
    abschnitte: [
      {titel: "Standard und erweitert", html:
        "<table><tr><th></th><th>Standard</th><th>Erweitert</th></tr>" +
        "<tr><td>Nummern</td><td>1 bis 99, 1300 bis 1999</td><td>100 bis 199, 2000 bis 2699</td></tr>" +
        "<tr><td>prüft</td><td>nur die Quelladresse</td><td>Quelle, Ziel, Protokoll, Port</td></tr>" +
        "<tr><td>Platz</td><td>möglichst nah am Ziel</td><td>möglichst nah an der Quelle</td></tr></table>" +
        "<p>Statt Nummern gehen auch Namen: <code>ip access-list extended GAST</code>.</p>"},
      {titel: "Regeln lesen", html:
        "<ul><li>Von oben nach unten, die <b>erste passende Regel</b> gewinnt, danach wird nicht weitergesucht.</li><li>Am Ende steht unsichtbar <b>deny any</b>: Was nicht erlaubt ist, ist verboten.</li><li><b>Wildcard</b>: 0 = muss passen, 1 = egal. /24 → <code>0.0.0.255</code>, einzelner Host → <code>host 10.0.0.5</code>, alles → <code>any</code>.</li></ul>"},
      {titel: "Beispiel: Gäste vom Praxisnetz trennen", html:
        "<pre>R1(config)# ip access-list extended GAST\nR1(config-ext-nacl)# deny ip 192.168.30.0 0.0.0.255 192.168.10.0 0.0.0.255\nR1(config-ext-nacl)# permit ip any any\nR1(config)# interface g0/0.30\nR1(config-subif)# ip access-group GAST in</pre>" +
        "<p><code>show access-lists</code> zeigt jede Regel mit ihren Treffern („matches“).</p>"},
    ],
    merksatz: "Erste passende Regel gewinnt, am Ende ist alles verboten.",
    pruefungstipp: "Eine zu allgemeine Regel oben verdeckt alle darunter; die Reihenfolge ist fast immer der Kern der Aufgabe.",
    quelle: "Infrastruktur & Sicherheit – Visuelle Lernnotiz",
    belege: "Cisco IOS Security Configuration Guide: IP Access Lists · 05-AP2-Infrastruktur-Sicherheit (Firewall-Grundregeln)",
    siehe: ["lab.fw", "lab.rostick", "lab.nat"],
  },
  "lab.route": {
    titel: "Statische Routen und Default-Route",
    kurz: "Ein Router kennt von selbst nur seine direkt angeschlossenen Netze; alle anderen lernt er über Routen.",
    abschnitte: [
      {titel: "Die Routingtabelle", html:
        "<table><tr><th>Kennung</th><th>Bedeutung</th></tr>" +
        "<tr><td>C</td><td>direkt angeschlossen (connected)</td></tr>" +
        "<tr><td>L</td><td>eigene Adresse der Schnittstelle (local, /32)</td></tr>" +
        "<tr><td>S</td><td>statisch eingetragen</td></tr>" +
        "<tr><td>S*</td><td>statische Default-Route</td></tr></table>" +
        "<p>Gibt es mehrere passende Einträge, gewinnt der mit dem <b>längsten Präfix</b> (der genaueste).</p>"},
      {titel: "Befehle", html:
        "<pre>R1(config)# ip route 10.0.2.0 255.255.255.0 10.0.1.2\nR1(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1\nR1# show ip route</pre>" +
        "<p>Die erste Zeile: Netz 10.0.2.0/24 liegt hinter dem Nachbarn 10.0.1.2. Die zweite: alles andere zum Provider (Default-Route, „Gateway of last resort“).</p>"},
      {titel: "Die Rückroute nicht vergessen", html:
        "<p>Routen gelten nur in eine Richtung. Kommt der Ping an, die Antwort aber nicht zurück, fehlt auf einem Router des Rückwegs die Route zum Netz des Absenders. Symptom: Zeitüberschreitung statt „nicht erreichbar“.</p>"},
    ],
    merksatz: "Hin braucht eine Route, zurück auch.",
    pruefungstipp: "Default-Route = 0.0.0.0/0. Statisch: einfach, aber passt sich nicht an Ausfälle an; dynamisch: Router tauschen Routen per Protokoll.",
    quelle: "Fragen – Netzwerke planen",
    belege: "Cisco IOS IP Routing: Static Routing Configuration Guide · Network – Lernfassung (§ 0)",
    siehe: ["lab.gateway", "lab.ttl", "lab.nat"],
  },
  "lab.ttl": {
    titel: "TTL und Traceroute",
    kurz: "Die TTL im IP-Header begrenzt, über wie viele Router ein Paket laufen darf; Traceroute macht sich das zunutze.",
    abschnitte: [
      {titel: "TTL", html:
        "<ul><li>8-Bit-Feld im IP-Header, gesetzt vom Absender (Windows meist 128, Linux 64).</li><li>Jeder Router zieht <b>1 ab</b>. Bei 0 wird das Paket verworfen, der Absender bekommt ICMP <b>Time Exceeded</b> (Typ 11).</li><li>So kreist ein Paket in einer Routingschleife nicht ewig.</li></ul>" +
        "<p>Aus der TTL einer Antwort lässt sich schätzen, wie viele Router dazwischen lagen: TTL=126 bei Start 128 heißt zwei Router.</p>"},
      {titel: "Traceroute", html:
        "<p>Traceroute sendet Pakete mit TTL 1, 2, 3 … Jeder Router, bei dem die TTL auf 0 fällt, meldet sich und verrät so seine Adresse. Windows: <code>tracert</code> (ICMP), Router: <code>traceroute</code>.</p>" +
        "<table><tr><th>Ausgabe</th><th>Bedeutung</th></tr>" +
        "<tr><td>Zeile mit Adresse</td><td>dieser Router ist Station n</td></tr>" +
        "<tr><td><code>*</code> bzw. Zeitüberschreitung</td><td>keine Antwort von dieser Station</td></tr>" +
        "<tr><td>zwei Adressen wechseln sich ab</td><td>Routingschleife</td></tr></table>"},
      {titel: "Traceroute in der Praxis", html:
        "<p>Jede Station wird mehrfach gefragt, deshalb stehen je Zeile meist drei Zeiten. Die Namen der Router verraten oft den Standort – und den Provider.</p>" +
        "<table><tr><th>Werkzeug</th><th>sendet</th><th>Hinweis</th></tr>" +
        "<tr><td><code>tracert</code> (Windows)</td><td>ICMP-Echo</td><td>ohne Zusatzprogramm nutzbar</td></tr>" +
        "<tr><td><code>traceroute</code> (Linux)</td><td>UDP auf hohe Ports</td><td>die Antwort kommt als ICMP-Fehler zurück</td></tr>" +
        "<tr><td><code>traceroute</code> (IOS)</td><td>UDP oder ICMP</td><td>am Router auch im Konfigurationsmodus mit <code>do</code></td></tr></table>" +
        "<p>Filtert ein Netz ICMP, bleiben Zeilen leer: Die Station ist da, sie meldet sich nur nicht. Wiederholen sich zwei Adressen mehrfach, läuft der Verkehr im Kreis – dieselbe Vermutung wie bei einem Ping, der nie ankommt. Auf echtem Windows sendet <code>pathping</code> mehr Pakete und rechnet den Verlust je Station aus – das Labor kennt nur <code>tracert</code>.</p>"},
      {titel: "IPv6: Hop Limit statt TTL", html:
        "<p>IPv6 führt kein Feld „TTL“, sondern das <b>Hop Limit</b> – ebenfalls 8 Bit und mit derselben Aufgabe: Jeder Router zieht eins ab, bei 0 wird das Paket verworfen, und der Absender bekommt ICMPv6 „Time Exceeded“ (Typ 3).</p>" +
        "<ul><li>Der IPv6-Kopf ist fest 40 Byte lang, Erweiterungen hängen dahinter.</li><li>Der Absender setzt meist 64 (Linux) oder 128 (Windows) – wie bei IPv4.</li><li>Traceroute arbeitet gleich: Pakete mit Hop Limit 1, 2, 3 …</li><li>Ein Router, der kein ICMPv6 sendet, erscheint als leere Zeile.</li></ul>" +
        "<p>Dieses Labor rechnet mit IPv4; dieses Feld steht hier zum Nachschlagen für die Prüfung und für echte Netze.</p>"},
    ],
    merksatz: "Die TTL sinkt an jedem Router um 1, nie steigt sie.",
    pruefungstipp: "Beliebter Fehler: „TTL wird erhöht“. Richtig ist: verringert, bei 0 verworfen. In IPv6 heißt dasselbe Feld Hop Limit.",
    quelle: "Network – Lernfassung",
    belege: "RFC 791 · RFC 792 · Netzwerk – Geschichten (Station für Station) · Cisco: Understanding the Ping and Traceroute Commands · Microsoft Learn: tracert, pathping · RFC 8200 (Hop Limit) · RFC 4443 (ICMPv6 Time Exceeded)",
    siehe: ["lab.route", "lab.ping", "lab.ip"],
  },
  "lab.nat": {
    titel: "NAT und PAT",
    kurz: "NAT ersetzt private Absenderadressen durch eine öffentliche, weil private Adressen im Internet nicht geroutet werden.",
    abschnitte: [
      {titel: "Warum und wie", html:
        "<ul><li>Private Bereiche (RFC 1918) darf jedes LAN verwenden, im Internet werden sie nicht geroutet.</li><li>Der Router tauscht auf dem Weg nach draußen die Quelladresse gegen seine öffentliche und merkt sich die Zuordnung, damit die Antwort zurückfindet.</li><li><b>PAT</b> (NAT-Overload): Viele Innenadressen teilen sich eine Außenadresse, unterschieden über die Ports.</li></ul>"},
      {titel: "PAT am Router", html:
        "<pre>R1(config)# access-list 1 permit 192.168.1.0 0.0.0.255\nR1(config)# ip nat inside source list 1 interface g0/1 overload\nR1(config)# interface g0/0\nR1(config-if)# ip nat inside\nR1(config)# interface g0/1\nR1(config-if)# ip nat outside</pre>" +
        "<p><b>inside</b> = LAN-Seite, <b>outside</b> = Internet-Seite. Kontrolle: <code>show ip nat translations</code>.</p>"},
      {titel: "Fehlerbilder", html:
        "<ul><li>inside und outside vertauscht: keine Übersetzung, Timeout.</li><li>Die Access-Liste erfasst das LAN nicht: nur manche Rechner kommen raus.</li><li>Keine Default-Route zum Provider: Das Paket kommt gar nicht bis zur Übersetzung.</li></ul>"},
    ],
    merksatz: "inside = drinnen (LAN), outside = draußen (Internet).",
    pruefungstipp: "NAT gegen PAT: NAT übersetzt Adressen, PAT bildet viele Adressen über Ports auf eine ab, wie am DSL-Router.",
    quelle: "Network – Lernfassung",
    belege: "RFC 1918 · RFC 3022 · Cisco IOS NAT Configuration Guide · Fragen – Netzwerke planen (nwp-10)",
    siehe: ["lab.portfwd", "lab.route", "lab.acl"],
  },
  "lab.portfwd": {
    titel: "Port-Weiterleitung",
    kurz: "Eine Port-Weiterleitung (statisches NAT mit Port) macht einen Dienst im LAN von außen erreichbar.",
    abschnitte: [
      {titel: "Warum PAT allein nicht reicht", html:
        "<p>PAT legt Einträge nur an, wenn eine Verbindung <b>von innen</b> startet. Kommt eine Anfrage von außen, weiß der Router ohne festen Eintrag nicht, welcher Rechner gemeint ist.</p>"},
      {titel: "Befehl", html:
        "<pre>R1(config)# ip nat inside source static tcp 192.168.1.50 443 203.0.113.2 443</pre>" +
        "<p>Anfragen an 203.0.113.2, TCP-Port 443, landen bei 192.168.1.50, Port 443. Außen- und Innenport dürfen verschieden sein, zum Beispiel außen 2222 auf innen 22.</p>"},
      {titel: "Mit Bedacht", html:
        "<ul><li>Nur weiterleiten, was wirklich gebraucht wird (Least Privilege).</li><li>Öffentliche Dienste gehören besser in eine <b>DMZ</b>, dann steht ein übernommener Server nicht mitten im LAN.</li><li>Für Fernzugriff auf Arbeitsplätze ist ein <b>VPN</b> die bessere Wahl als offene Ports.</li></ul>"},
    ],
    merksatz: "Von außen findet nur, wer einen festen Eintrag hat.",
    pruefungstipp: "Begründung für DMZ statt Weiterleitung ins LAN: Wird der Server übernommen, schützt die zweite Grenze das interne Netz.",
    quelle: "05-AP2-Infrastruktur-Sicherheit",
    belege: "Cisco IOS NAT Configuration Guide (Static NAT with port) · RFC 3022 · Infrastruktur & Sicherheit – Visuelle Lernnotiz (DMZ)",
    siehe: ["lab.nat", "lab.dmz", "lab.fw"],
  },
  "lab.fw": {
    titel: "Firewall-Regeln und Zonen",
    kurz: "Eine Firewall erlaubt oder verwirft Verkehr zwischen Zonen nach einer Regeltabelle, die von oben nach unten gelesen wird.",
    abschnitte: [
      {titel: "Zonen und Regeln", html:
        "<p>Jede Schnittstelle gehört zu einer Zone: <b>innen</b> (LAN), <b>außen</b> (Internet), <b>DMZ</b>. Eine Regel sagt: von Zone, nach Zone, Protokoll, Port, erlauben oder verwerfen.</p>" +
        "<table><tr><th>Nr</th><th>von</th><th>nach</th><th>Dienst</th><th>Aktion</th></tr>" +
        "<tr><td>1</td><td>innen</td><td>außen</td><td>tcp 443</td><td>erlauben</td></tr>" +
        "<tr><td>2</td><td>innen</td><td>außen</td><td>udp 53</td><td>erlauben</td></tr>" +
        "<tr><td>3</td><td>alle</td><td>alle</td><td>alles</td><td>verwerfen</td></tr></table>"},
      {titel: "Grundsätze", html:
        "<ul><li><b>Deny by default</b>: Was nicht ausdrücklich erlaubt ist, ist verboten.</li><li><b>Erste passende Regel gewinnt</b>: Eine „alles verbieten“-Regel ganz oben sperrt alles.</li><li><b>Zustandsbehaftet</b>: Antworten auf erlaubte Verbindungen kommen automatisch zurück, dafür braucht es keine eigene Regel.</li><li>Nur benötigte Ports öffnen und jede Regel dokumentieren.</li></ul>"},
      {titel: "Arten von Firewalls", html:
        "<table><tr><th>Art</th><th>Blick auf</th><th>Grenze</th></tr>" +
        "<tr><td>Paketfilter</td><td>Kopfzeilen: Adresse, Protokoll, Port</td><td>kennt keinen Zusammenhang, Regeln in beide Richtungen nötig</td></tr>" +
        "<tr><td>Stateful Inspection</td><td>Verbindungen samt Zustand</td><td>verschlüsselte Inhalte bleiben unsichtbar</td></tr>" +
        "<tr><td>Application Firewall / NGFW</td><td>Anwendung, Benutzer, Inhalte</td><td>mehr Prüftiefe, mehr Pflege und Rechenlast</td></tr>" +
        "<tr><td>Proxy</td><td>vermittelt selbst, oft mit Zwischenspeicher</td><td>muss die Anwendung kennen, kein reiner Durchlauf</td></tr></table>" +
        "<p>Am Rand eines Netzes steht heute meist ein Gerät, das mehrere Arten verbindet. Für die Prüfung zählt der Unterschied: Der Paketfilter sieht nur Kopfzeilen, der Proxy vermittelt selbst, und eine Firewall mit Anwendungssicht muss mehr wissen – und mehr gepflegt werden.</p>"},
      {titel: "Regeln pflegen und prüfen", html:
        "<ul><li><b>Aufnehmen</b>, welche Dienste wirklich gebraucht werden – Bedarf, nicht Wunsch. Je Regel: Nummer, von, nach, Dienst, Zweck, verantwortlich, Datum.</li><li><b>Testen</b>: Verkehr aus der erlaubten Richtung muss gehen, alles andere nicht. Ein Portscan ist nur mit Auftrag und Erlaubnis zulässig.</li><li><b>Beobachten</b>: Trefferzähler und Log zeigen, welche Regel greift – und welche seit Monaten niemand braucht.</li><li><b>Ändern</b>: über einen Change mit Rückweg; zeitlich befristete Regeln nach Ablauf entfernen.</li><li><b>Prüfen</b>: Regeln von oben nach unten durchgehen. Eine Regel, die nie greifen kann, ist ein Denkfehler.</li></ul>"},
      {titel: "Was eine Firewall nicht kann", html:
        "<p>Eine Firewall ist eine Grenze, kein Rundumschutz. Sie hilft nicht gegen:</p>" +
        "<ul><li>Angriffe <b>aus dem eigenen LAN</b>: Wer schon drinnen ist, darf oft viel.</li><li><b>Phishing, USB-Stick, E-Mail-Anhang</b>: Der Schadcode kommt auf einem erlaubten Weg herein.</li><li><b>Ungepatchte Systeme und zu weite Rechte</b>: Dafür gibt es Patch- und Rechteverwaltung.</li><li><b>Verschlüsselten Verkehr</b>, dessen Inhalt sie nicht aufbricht – die Verbindung darf sein, der Inhalt bleibt verborgen.</li><li><b>Ausfälle</b>: Gegen einen Geräte- oder Stromausfall hilft nur Redundanz.</li></ul>" +
        "<p>Und wer von zu Hause arbeitet, sitzt außerhalb der Firmengrenze. Dort schützt die Firewall nicht – dafür braucht es VPN und einen geschützten Arbeitsplatz.</p>"},
    ],
    merksatz: "Alles zu, nur Benötigtes auf, und die Reihenfolge entscheidet.",
    pruefungstipp: "Regeln immer mit Bedarf begründen: „Port 443 nach außen, weil die Mitarbeiter Webseiten per HTTPS nutzen.“ Und die Grenze nennen: Eine Firewall schützt nicht vor Angriffen aus dem eigenen LAN.",
    quelle: "Infrastruktur & Sicherheit – Visuelle Lernnotiz",
    belege: "05-AP2-Infrastruktur-Sicherheit (Firewall-Grundregeln) · BSI IT-Grundschutz-Kompendium, NET.1.1 Netzarchitektur und -design",
    siehe: ["lab.dmz", "lab.acl", "lab.ports"],
  },
  "lab.dmz": {
    titel: "DMZ",
    kurz: "Die DMZ ist eine eigene Zone für Dienste, die aus dem Internet erreichbar sein müssen, getrennt vom internen Netz.",
    abschnitte: [
      {titel: "Aufbau", html:
        "<p>Öffentliche Dienste wie Webserver, Kundenportal oder Mail-Gateway stehen in der DMZ. Die Firewall regelt drei Übergänge: Internet zur DMZ, LAN zur DMZ und DMZ zum LAN.</p>"},
      {titel: "Typisches Regelwerk", html:
        "<table><tr><th>von</th><th>nach</th><th>Regel</th></tr>" +
        "<tr><td>außen</td><td>DMZ</td><td>nur der veröffentlichte Dienst, zum Beispiel tcp 443</td></tr>" +
        "<tr><td>innen</td><td>DMZ</td><td>erlaubt, was die Mitarbeiter brauchen</td></tr>" +
        "<tr><td>DMZ</td><td>innen</td><td><b>verboten</b> (höchstens einzelne, begründete Ausnahmen)</td></tr>" +
        "<tr><td>außen</td><td>innen</td><td>verboten</td></tr></table>"},
      {titel: "Warum", html:
        "<p>Ein Server, der aus dem Internet erreichbar ist, ist angreifbar. Wird er übernommen, schützt die Grenze zwischen DMZ und LAN das interne Netz.</p>"},
    ],
    merksatz: "Aus der DMZ führt kein Weg ins LAN.",
    pruefungstipp: "In Situationsaufgaben: öffentlicher Dienst → DMZ, mit Begründung „Schutz des internen Netzes bei Kompromittierung“.",
    quelle: "05-AP2-Infrastruktur-Sicherheit",
    belege: "Infrastruktur & Sicherheit – Visuelle Lernnotiz (Firmennetz mit DMZ und VLANs) · 07-Uebungen-Subnetting-Szenarien (Aufgabe 5)",
    siehe: ["lab.fw", "lab.portfwd"],
  },
  "lab.portsec": {
    titel: "Port-Security",
    kurz: "Port-Security legt fest, welche und wie viele MAC-Adressen an einem Switchport senden dürfen.",
    abschnitte: [
      {titel: "Einrichten", html:
        "<pre>SW1(config)# interface fa0/5\nSW1(config-if)# switchport mode access\nSW1(config-if)# switchport port-security\nSW1(config-if)# switchport port-security maximum 1\nSW1(config-if)# switchport port-security mac-address sticky\nSW1(config-if)# switchport port-security violation shutdown</pre>" +
        "<p>Standard ist höchstens eine MAC und die Aktion shutdown. Mit <code>sticky</code> merkt sich der Switch die erste gelernte MAC. Port-Security geht nur auf Access-Ports (oder fest eingestellten Trunks), nicht auf aushandelnden Ports.</p>"},
      {titel: "Was bei einem Verstoß passiert", html:
        "<table><tr><th>Modus</th><th>fremde Frames</th><th>Meldung</th><th>Port</th></tr>" +
        "<tr><td>protect</td><td>verworfen</td><td>keine</td><td>bleibt an</td></tr>" +
        "<tr><td>restrict</td><td>verworfen</td><td>Log, Zähler</td><td>bleibt an</td></tr>" +
        "<tr><td>shutdown</td><td>verworfen</td><td>Log, Zähler</td><td>err-disabled</td></tr></table>" +
        "<p>Wieder einschalten: Ursache klären, dann in der Schnittstelle <code>shutdown</code> und <code>no shutdown</code>. Übersicht: <code>show port-security interface fa0/5</code>.</p>"},
      {titel: "Wogegen es hilft", html:
        "<p>Gegen fremde Geräte an Netzwerkdosen und gegen <b>MAC Flooding</b>, bei dem ein Angreifer die MAC-Tabelle des Switches überflutet. Gegen ARP-Spoofing hilft dagegen Dynamic ARP Inspection.</p>"},
      {titel: "WLAN: warum Port-Security hier nicht greift", html:
        "<p>Port-Security sichert eine <b>Buchse</b>: ein Kabel, ein Gerät, eine gelernte MAC. Im Funk gibt es keine Buchse – alle Geräte einer Zelle teilen sich das Medium, und die MAC-Adresse darf jedes Gerät selbst wählen. Ein MAC-Filter am Access Point ist deshalb keine Sicherheit, sondern nur eine Hürde.</p>" +
        "<table><tr><th>Maßnahme</th><th>Was sie leistet</th></tr>" +
        "<tr><td>WPA2 (CCMP/AES)</td><td>Verschlüsselt den Funkverkehr; der Schlüssel kommt aus einem Passwort (PSK) oder aus der Anmeldung</td></tr>" +
        "<tr><td>WPA3</td><td>Wie WPA2, dazu Schutz gegen Mitschneiden und gegen das Raten des Passworts (SAE)</td></tr>" +
        "<tr><td>802.1X mit RADIUS</td><td>Jeder Nutzer meldet sich einzeln an; im Betrieb der übliche Weg (WPA2-/WPA3-Enterprise)</td></tr>" +
        "<tr><td>Offenes Netz</td><td>Keine Verschlüsselung – nur mit vorgeschaltetem Portal und getrenntem VLAN vertretbar</td></tr></table>" +
        "<p>Die alten Verfahren WEP und WPA mit TKIP gelten als gebrochen. Ein Gästenetz trennt die Geräte zusätzlich voneinander, damit Besucher sich nicht gegenseitig sehen. Und wie am Kabel gilt: Wer am Netz ist, darf nicht mehr dürfen, als er muss.</p>"},
    ],
    merksatz: "Fremde MAC am gesicherten Port: Port aus, bis jemand nachsieht.",
    pruefungstipp: "Die drei Modi protect, restrict und shutdown unterscheiden können; shutdown ist Standard. Am Funk greift Port-Security nicht – dort sichern WPA2/WPA3 und 802.1X.",
    quelle: "Network – Lernfassung",
    belege: "Cisco Catalyst Software Configuration Guide: Configuring Port Security · VLAN – Lernfassung (§ 3 Sicherheit) · IEEE 802.11i (WPA2, CCMP/AES) · IEEE 802.1X (Anmeldung im Netz) · WPA3 Specification (Wi-Fi Alliance) · BSI IT-Grundschutz-Kompendium, NET.2.1 WLAN-Betrieb",
    siehe: ["lab.switch", "lab.vlan", "lab.link"],
  },
  "lab.stp": {
    titel: "Schleifen und Spanning Tree",
    kurz: "Spanning Tree schaltet redundante Wege zwischen Switches ab, damit keine Schleife entsteht.",
    abschnitte: [
      {titel: "Das Problem", html:
        "<p>Zwei Switches, zwei Kabel dazwischen: Ein Broadcast wird an jedem Switch geflutet und kommt über das andere Kabel zurück. Ethernet-Frames haben <b>keine TTL</b>, sie kreisen also endlos und vervielfachen sich: ein <b>Broadcast-Sturm</b>. Nebenbei springen die MAC-Tabellen hin und her.</p>"},
      {titel: "Die Lösung", html:
        "<p><b>STP</b> (IEEE 802.1D; RSTP 802.1w ist seit 802.1D-2004 Teil desselben Standards) wählt eine Wurzel (Root-Bridge) und blockiert Ports so, dass ein Baum ohne Kreise entsteht. Fällt ein Weg aus, gibt STP einen blockierten Port frei. <b>BPDU Guard</b> schaltet einen Access-Port ab, an dem plötzlich ein Switch STP spricht.</p>"},
      {titel: "Wer wird Wurzel? (Root-Bridge wählen)", html:
        "<p>Jedes VLAN wählt seine eigene Wurzel. Verglichen wird die <b>Bridge-ID</b>: zuerst die Priorität, bei Gleichstand die kleinere MAC-Adresse. Die Priorität läuft in Schritten von 4096 und steht ab Werk auf 32768; die VLAN-Nummer zählt mit, deshalb kann die Wurzel je VLAN eine andere sein.</p>" +
        "<table><tr><th>Rolle</th><th>Bedeutung</th></tr>" +
        "<tr><td>Root-Bridge</td><td>sitzt in der Mitte des Baums, alle ihre Ports leiten weiter</td></tr>" +
        "<tr><td>Root-Port</td><td>der beste Weg zur Wurzel, je Nicht-Wurzel-Switch genau einer</td></tr>" +
        "<tr><td>Designated Port</td><td>leitet auf einem Segment weiter</td></tr>" +
        "<tr><td>Alternate Port</td><td>blockiert und springt bei Ausfall ein</td></tr></table>" +
        "<p>Der Weg wird über die Pfadkosten bewertet, klein gewinnt. Kurzverfahren (IEEE): 100 Mbit/s = 19, 1 Gbit/s = 4, 10 Gbit/s = 2. Cisco rechnet beim Langverfahren mit 20000 für 1 Gbit/s. Damit die Wurzel dort steht, wo du sie haben willst, setzt du die Priorität:</p>" +
        "<pre>SW1(config)# spanning-tree vlan 10 root primary\nSW1# show spanning-tree vlan 10</pre>" +
        "<p><b>Echtes IOS, nicht das Labor:</b> Beide Zeilen gehören auf echte Hardware. Das Labor kennt keinen <code>spanning-tree</code>-Befehl – es zeigt STP nur als Zeile in der running-config, einstellen lässt es sich dort nicht.</p>"},
      {titel: "Zustände, Wartezeit und Schutz", html:
        "<p>Ein Port leitet nicht sofort weiter. Klassisches STP (802.1D) kennt fünf Zustände; bis zum Weiterleiten vergehen rund 30 bis 50 s.</p>" +
        "<table><tr><th>802.1D</th><th>RSTP (802.1w)</th><th>Was passiert</th></tr>" +
        "<tr><td>Blocking</td><td>Discarding</td><td>Frames werden verworfen, BPDUs werden gehört</td></tr>" +
        "<tr><td>Listening</td><td>Discarding</td><td>die Wahl läuft, es wird noch nicht gelernt</td></tr>" +
        "<tr><td>Learning</td><td>Learning</td><td>die MAC-Tabelle füllt sich, weitergeleitet wird noch nicht</td></tr>" +
        "<tr><td>Forwarding</td><td>Forwarding</td><td>der Port arbeitet normal</td></tr>" +
        "<tr><td>Disabled</td><td>Discarding</td><td>der Port ist abgeschaltet, kein STP</td></tr></table>" +
        "<p><b>RSTP</b> ist in unter einer Sekunde auf Forwarding, weil Nachbarn sich per Proposal und Agreement einigen. Ein Port zu einem Endgerät braucht keine Wartezeit: <code>spanning-tree portfast</code>, bei RSTP Edge-Port. Weil an einem Endgeräteport kein Switch hängen darf, schaltet <b>BPDU Guard</b> den Port ab, sobald dort doch BPDUs ankommen. <b>Root Guard</b> verhindert, dass ein fremder Switch die Wurzel wird. PortFast, BPDU Guard und Root Guard sind echte IOS-Konfiguration – das Labor zeigt STP nur als Ausgabe, einstellen lässt es sich dort nicht.</p>"},
    ],
    merksatz: "Redundanz ja, Schleife nein: dafür gibt es Spanning Tree.",
    pruefungstipp: "STP verhindert Schleifen und Broadcast-Stürme; LACP bündelt Leitungen, das ist etwas anderes.",
    quelle: "Fragen – Netzwerke planen",
    belege: "IEEE 802.1D · IEEE 802.1w · VLAN – Lernfassung (§ 3: STP, BPDU Guard) · Cisco Catalyst Software Configuration Guide: Configuring Spanning Tree Protocol (root primary, PortFast, BPDU Guard, Root Guard)",
    siehe: ["lab.switch", "lab.vlan"],
  },
  "lab.storage": {
    titel: "NAS, SAN und Speichernetze",
    kurz: "Zentraler Speicher kommt als Dateiablage (NAS) oder als Blockspeicher über ein Speichernetz (SAN) zu den Rechnern.",
    abschnitte: [
      {titel: "Drei Orte für Speicher", html:
        "<table><tr><th>Art</th><th>Was</th><th>Zugriff</th></tr>" +
        "<tr><td>DAS</td><td>Platte direkt im oder am Rechner</td><td>nur dieser Rechner</td></tr>" +
        "<tr><td>NAS</td><td>Dateiserver im LAN</td><td>Dateien über SMB (TCP 445) oder NFS (2049)</td></tr>" +
        "<tr><td>SAN</td><td>Speichernetz für Blockspeicher</td><td>iSCSI (TCP 3260) oder Fibre Channel</td></tr></table>"},
      {titel: "Datei oder Block?", html:
        "<p>Ein <b>NAS</b> liefert Dateien, das Dateisystem verwaltet das NAS; gut für gemeinsame Ablagen. Ein <b>SAN</b> liefert Blöcke wie eine lokale Platte, der Rechner formatiert sie selbst; gut für Datenbanken und virtuelle Maschinen.</p>"},
      {titel: "RAID: Ausfall aushalten, nicht ersetzen", html:
        "<p>RAID verteilt die Daten auf mehrere Platten. Es rettet den Betrieb bei einem Plattenausfall, ersetzt aber <b>keine Sicherung</b>: Ein gelöschter oder verschlüsselter Ordner liegt auf allen Platten gleich.</p>" +
        "<table><tr><th>Stufe</th><th>Platten</th><th>Verfahren</th><th>übersteht</th></tr>" +
        "<tr><td>RAID 0</td><td>ab 2</td><td>verteilen (Striping), keine Redundanz</td><td>nichts – schnell, aber riskant</td></tr>" +
        "<tr><td>RAID 1</td><td>ab 2</td><td>Spiegel</td><td>eine Platte</td></tr>" +
        "<tr><td>RAID 5</td><td>ab 3</td><td>verteilen mit einer Parität</td><td>eine Platte</td></tr>" +
        "<tr><td>RAID 6</td><td>ab 4</td><td>verteilen mit zwei Paritäten</td><td>zwei Platten</td></tr>" +
        "<tr><td>RAID 10</td><td>ab 4</td><td>erst spiegeln, dann verteilen</td><td>je Spiegel eine Platte</td></tr></table>" +
        "<p>Nutzkapazität: RAID 1 und RAID 10 verschenken die Hälfte, RAID 5 eine Platte, RAID 6 zwei. Nach einem Ausfall läuft der Verbund weiter, aber ohne Schutz. Der <b>Rebuild</b> liest alle Platten und dauert Stunden – deshalb Ersatzplatten bereithalten und die Platten überwachen.</p>"},
      {titel: "Anbindung und Betrieb", html:
        "<table><tr><th>Thema</th><th>Worauf es ankommt</th></tr>" +
        "<tr><td>iSCSI (TCP 3260)</td><td>Initiator am Server, Target am Speichersystem, je Seite ein IQN-Name; eigenes VLAN, weil der Verkehr über das normale IP-Netz läuft</td></tr>" +
        "<tr><td>Fibre Channel</td><td>eigenes Netz mit WWN und Zoning: teurer, aber gleichmäßig schnell</td></tr>" +
        "<tr><td>Multipathing</td><td>zwei getrennte Wege zum Speicher; fällt ein Switch aus, bleibt der Zugriff erhalten</td></tr>" +
        "<tr><td>SMB und NFS</td><td>Dateifreigaben mit Berechtigungen: Freigabe- und Dateirechte wirken zusammen</td></tr>" +
        "<tr><td>Snapshots</td><td>zeigen einen alten Stand auf demselben System – praktisch gegen Löschen, aber keine Sicherung</td></tr></table>" +
        "<p>Gewählt wird nach Zugriffsmuster: Viele kleine Zugriffe einer Datenbank und virtuelle Maschinen passen auf Blockspeicher, gemeinsame Dateien auf eine Freigabe. Im Rechenzentrum bekommt der Speicherverkehr ein eigenes Netz, und die Sicherung liegt getrennt davon.</p>"},
      {titel: "Virtualisierung: Speicher für virtuelle Maschinen", html:
        "<p>Ein <b>Hypervisor</b> teilt die Hardware in virtuelle Maschinen (VM). Typ 1 läuft direkt auf dem Server, Typ 2 auf einem Betriebssystem. Jede VM hat eigene virtuelle Platten – als Datei oder als LUN im Speichernetz.</p>" +
        "<ul><li><b>Konsolidierung</b>: viele kleine Server als VMs auf wenigen großen, weniger Verbrauch, leichteres Sichern.</li><li><b>Snapshot vor dem Update</b>: ein Rückweg bei misslungenem Patch, aber kein Ersatz für die Sicherung.</li><li><b>Container</b> teilen sich einen Kernel und starten schneller, ersetzen eine VM aber nicht in jedem Fall.</li><li><b>Planen</b>: CPU, Arbeitsspeicher und die Zugriffe je Sekunde (IOPS) des Speichers begrenzen die Zahl der VMs.</li></ul>"},
    ],
    merksatz: "NAS = Dateien teilen, SAN = Platten übers Netz.",
    pruefungstipp: "Datenbank mit vielen kleinen Zugriffen: eher SAN; gemeinsame Dateiablage: NAS. RAID schützt vor Plattenausfall, nie vor Löschen.",
    quelle: "Storage-Konzeptatlas",
    belege: "IANA Port Number Registry (445, 2049, 3260) · Brücke – FISI und Alltag zu Storage und Cloud · SNIA Dictionary (Snapshot, RAID) · BSI IT-Grundschutz-Kompendium, CON.3 Datensicherungskonzept",
    siehe: ["lab.ports"],
  },
});
