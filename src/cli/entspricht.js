"use strict";
/* ---------- Konsole: GUI ↔ Befehl, Befehlsblöcke, Vorschläge ----------
   CLI.entspricht(geraet, pfad, wert) → Befehlsblock für die „entspricht:“-Zeile im Inspektor | null
   CLI.anwenden(netz, id, text, {verlauf?}) → {ok, fehler:[{nr, zeile, meldung}]}   (ab privilegiertem Modus, Rückfragen automatisch)
   CLI.vorschlag(sitzung) → {befehl, text} | null   (Einstieg: nächster sinnvoller Befehl) */
(() => {
  const C = CLI, h = C.h;

  /* ---------- entspricht ---------- */
  const klassenMaske = ip => { const a = IP.zuZahl(ip) >>> 24; return a < 128 ? "255.0.0.0" : a < 192 ? "255.255.0.0" : "255.255.255.0"; };
  function ifFeld(g, name, feld, wert, k){
    const art = h.ifArt(g, name);
    k = k || {};
    switch (feld) {
      case "ip": return wert ? [` ip address ${wert} ${IP.maskeGueltig(k.maske) ? k.maske : klassenMaske(wert)}`] : [" no ip address"];
      case "maske": return k.ip ? [` ip address ${k.ip} ${wert}`] : null;
      case "shutdown": return [wert ? " shutdown" : " no shutdown"];
      case "beschreibung": return [wert ? ` description ${wert}` : " no description"];
      case "nat": return [wert ? ` ip nat ${wert}` : ` no ip nat ${k.nat || "inside"}`];
      case "aclIn": case "aclOut": {
        const r = feld === "aclIn" ? "in" : "out";
        return [wert ? ` ip access-group ${wert} ${r}` : ` no ip access-group ${k[feld] ? k[feld] + " " : ""}${r}`];
      }
      case "helper": {
        const alt = k.helper || [], neu = wert || [];
        if (!neu.length) return [" no ip helper-address"];
        return [...alt.filter(x => !neu.includes(x)).map(x => ` no ip helper-address ${x}`), ...neu.map(x => ` ip helper-address ${x}`)];
      }
      case "vlan": return wert == null ? [" no encapsulation dot1Q"] : [` encapsulation dot1Q ${wert}${k.nativ ? " native" : ""}`];
      case "nativ": return k.vlan == null ? null : [` encapsulation dot1Q ${k.vlan}${wert ? " native" : ""}`];
      case "accessVlan": return [` switchport access vlan ${wert}`];
      case "modus": return [` switchport mode ${wert}`];
      case "trunkErlaubt": return [` switchport trunk allowed vlan ${wert === "all" ? "all" : (wert || []).length ? h.vlanListeText(wert) : "none"}`];
      case "nativeVlan": return [` switchport trunk native vlan ${wert}`];
      case "portSecurity": {
        if (!wert) return [" no switchport port-security"];
        const z = [" switchport mode access", " switchport port-security"];
        if (wert.max != null && wert.max !== 1) z.push(` switchport port-security maximum ${wert.max}`);
        if (wert.verstoss && wert.verstoss !== "shutdown") z.push(` switchport port-security violation ${wert.verstoss}`);
        for (const m of wert.macs || []) z.push(` switchport port-security mac-address ${IP.macCisco(m)}`);
        return z;
      }
    }
    if (art === "port" || art === "phys" || art === "sub" || art === "svi") return null;
    return null;
  }
  function ifBlock(g, name, zeilen){ return zeilen && zeilen.length ? [`interface ${h.langName(name)}`, ...zeilen].join("\n") : null; }
  function aclDiff(alt, neu){
    const z = [];
    for (const [n, a] of Object.entries(alt || {})) if (!(neu || {})[n]) z.push(a.benannt ? `no ip access-list ${a.typ === "standard" ? "standard" : "extended"} ${n}` : `no access-list ${n}`);
    for (const [n, a] of Object.entries(neu || {})) {
      if (alt && alt[n] && JSON.stringify(alt[n]) === JSON.stringify(a)) continue;
      if (alt && alt[n] && !a.benannt) z.push(`no access-list ${n}`);
      if (alt && alt[n] && a.benannt) z.push(`no ip access-list ${alt[n].typ === "standard" ? "standard" : "extended"} ${n}`);
      z.push(...C.aclZeilen(n, a));
    }
    return z;
  }
  function listenDiff(alt, neu, zeileFn, noFn){
    const a = (alt || []).map(zeileFn), n = (neu || []).map(zeileFn);
    return [...a.filter(x => !n.includes(x)).map(noFn), ...n.filter(x => !a.includes(x))];
  }
  function iosEntspricht(g, s, wert){
    const k = g.running, kopf = s[0];
    switch (kopf) {
      case "hostname": return wert ? `hostname ${wert}` : "no hostname";
      case "enableSecret": return wert ? `enable secret ${wert}` : "no enable secret";
      case "banner": return wert ? C.bannerZeile(wert) : "no banner motd";
      case "defaultGateway": return wert ? `ip default-gateway ${wert}` : "no ip default-gateway";
      case "domainLookup": return wert === false ? "no ip domain-lookup" : "ip domain-lookup";
      case "if": case "ports": case "svi": {
        if (!s[1]) return null;
        const name = kopf === "svi" ? "Vlan" + s[1] : s[1];
        const aktuell = kopf === "svi" ? (k.svi || {})[s[1]] : kopf === "ports" ? (k.ports || {})[name] : (k.if || {})[name];
        if (s.length === 2) {                                   /* ganzes Objekt (z. B. neues Subinterface) */
          if (wert == null) return h.ifArt(g, name) === "sub" || kopf === "svi" ? `no interface ${h.langName(name)}` : null;
          return ifBlock(g, name, C.ifZeilen(g, name, wert));
        }
        const feld = s[2];
        if (feld === "portSecurity" && s.length > 3) return null;
        return ifBlock(g, name, ifFeld(g, name, feld, wert, aktuell));
      }
      case "routen": {
        const z = listenDiff(k.routen, wert, C.routeZeile, x => "no " + x);
        return (z.length ? z : (wert || []).map(C.routeZeile)).join("\n") || null;
      }
      case "acls": {
        if (s[1]) { const alt = {}, neu = {}; if ((k.acls || {})[s[1]]) alt[s[1]] = k.acls[s[1]]; if (wert) neu[s[1]] = wert; return aclDiff(alt, neu).join("\n") || C.aclZeilen(s[1], wert).join("\n"); }
        const z = aclDiff(k.acls, wert);
        return (z.length ? z : Object.entries(wert || {}).flatMap(([n, a]) => C.aclZeilen(n, a))).join("\n") || null;
      }
      case "nat": {
        const neu = s[1] ? Object.assign({}, k.nat, {[s[1]]: wert}) : wert;
        const z = listenDiff(C.natZeilen(k.nat), C.natZeilen(neu), x => x, x => "no " + x);
        return (z.length ? z : C.natZeilen(neu)).join("\n") || null;
      }
      case "dhcp": {
        const neu = s[1] ? Object.assign({}, k.dhcp, {[s[1]]: wert}) : wert || {};
        const ex = x => `ip dhcp excluded-address ${x.von}${x.bis && x.bis !== x.von ? " " + x.bis : ""}`;
        const z = listenDiff((k.dhcp || {}).ausgeschlossen, neu.ausgeschlossen, ex, x => "no " + x);
        const altP = {}; for (const p of (k.dhcp || {}).pools || []) altP[p.name] = p;
        const neuP = {}; for (const p of neu.pools || []) neuP[p.name] = p;
        for (const n of Object.keys(altP)) if (!neuP[n]) z.push(`no ip dhcp pool ${n}`);
        for (const [n, p] of Object.entries(neuP)) if (JSON.stringify(altP[n]) !== JSON.stringify(p)) z.push(...C.poolZeilen(p));
        if (!z.length) { z.push(...(neu.ausgeschlossen || []).map(ex)); for (const p of neu.pools || []) z.push(...C.poolZeilen(p)); }
        return z.join("\n") || null;
      }
      case "lines": {
        const l = s[1] ? Object.assign({}, k.lines, {[s[1]]: wert}) : wert || {}, z = [];
        for (const [art, kopfZeile] of [["con", "line console 0"], ["vty", "line vty 0 4"]]) {
          const x = l[art]; if (!x) continue;
          z.push(kopfZeile, x.passwort ? ` password ${x.passwort}` : " no password", x.login ? " login" : " no login");
        }
        return z.join("\n") || null;
      }
      case "vlan": case "vlans": case "flash": {
        const nr = kopf === "flash" ? s[2] : s[1]; if (!nr) return null;
        if (wert == null) return `no vlan ${nr}`;
        const name = typeof wert === "string" ? wert : wert.name;
        return name ? `vlan ${nr}\n name ${name}` : `vlan ${nr}`;
      }
    }
    return null;
  }
  /* Windows-Befehl (netsh) für Host-Pfade */
  function hostEntspricht(g, s, wert){
    if (s[0] !== "if" || !s[1] || !s[2]) return null;
    const k = Object.assign({}, g.running.if[s[1]] || {}, {[s[2]]: wert});
    const name = `name="${s[1] === "eth0" ? "Ethernet" : "Ethernet " + (Number(s[1].replace(/\D/g, "")) + 1)}"`;
    switch (s[2]) {
      case "ip": case "maske": case "gw":
        if (!k.ip || !k.maske) return null;
        return `netsh interface ip set address ${name} static ${k.ip} ${k.maske}${k.gw ? " " + k.gw : ""}`;
      case "dhcp":
        if (wert) return `netsh interface ip set address ${name} dhcp`;
        return k.ip && k.maske ? `netsh interface ip set address ${name} static ${k.ip} ${k.maske}${k.gw ? " " + k.gw : ""}` : null;
      case "dns": return wert ? `netsh interface ip set dns ${name} static ${wert}` : `netsh interface ip delete dns ${name} all`;
      case "an": return `netsh interface set interface ${name} admin=${wert === false ? "disabled" : "enabled"}`;
    }
    return null;
  }
  C.entspricht = function(g, pfad, wert){
    if (!g || pfad == null) return null;
    try {
      const s = Modell.pfad(pfad);
      if (Modell.HOST[g.typ]) return hostEntspricht(g, s, wert);
      if (g.typ === "router" || g.typ === "switch") return iosEntspricht(g, s, wert);
    } catch (e) { return null; }
    return null;
  };

  /* ---------- anwenden: mehrzeiliger Block, ab privilegiertem Modus ---------- */
  C.anwenden = function(netz, id, text, o = {}){
    const g = netz.geraete[id];
    if (!g) return {ok: false, fehler: [{nr: 0, zeile: "", meldung: "Gerät nicht gefunden: " + id, toString(){ return this.meldung; }}]};
    const lauf = () => {
      const s = C.sitzung(netz, id, {einstieg: false});
      s.rueckfrage = null;
      if (s.art === "ios") s.modus = "priv";
      if (s.art === "fw") s.modus = "fwPriv";
      const fehler = [];
      const zeilen = String(text == null ? "" : text).replace(/\r/g, "").split("\n");
      zeilen.forEach((roh, i) => {
        const zeile = roh.replace(/\s+$/, "");
        if (!s.rueckfrage && (!zeile.trim() || /^\s*!/.test(zeile))) return;
        if (s.modus === "abgemeldet") C.eingabe(s, "");
        if (s.modus === "user" && s.art === "ios") s.modus = "priv";
        const r = C.eingabe(s, zeile);
        if (r.fehler) {
          const meldung = String(r.ausgabe || "").split("\n").filter(x => x.trim() && !/^\s*\^\s*$/.test(x)).join(" ") || "Fehler";
          fehler.push({nr: i + 1, zeile: zeile.trim(), meldung, toString(){ return `Zeile ${this.nr} „${this.zeile}“: ${this.meldung}`; }});
        }
        /* Rückfragen mit Vorgabe automatisch beantworten (Banner-Text u. ä. kommt aus den folgenden Zeilen) */
        let schutz = 0;
        while (s.rueckfrage && s.rueckfrage.auto != null && schutz++ < 10) C.eingabe(s, s.rueckfrage.auto);
      });
      return {ok: fehler.length === 0, fehler};
    };
    if (o.verlauf) {
      const n = String(text || "").split("\n").filter(z => z.trim()).length;
      return o.verlauf.aendern(`Konsole: Befehlsblock (${n} Zeilen) auf ${g.name}`, lauf);
    }
    return lauf();
  };

  /* ---------- Vorschlag für den Einstieg ---------- */
  const V = (befehl, text) => ({befehl, text});
  C.vorschlag = function(s){
    if (!s || s.rueckfrage) return null;
    const g = h.geraet(s); if (!g || !g.an) return null;
    const hist = s.historie.map(x => x.toLowerCase());
    const schon = re => hist.some(x => re.test(x));
    if (s.art === "host") {
      const a = C.hostAdresse(s, "eth0"), linux = s.os === "linux";
      if (linux ? !schon(/^ip (a|addr)/) : !schon(/^ipconfig/)) return linux ? V("ip a", "Zeigt die Schnittstellen dieses Rechners mit ihren Adressen.") : V("ipconfig", "Zeigt Adresse, Maske und Gateway dieses Rechners.");
      if (a.gw && !schon(new RegExp("^ping\\s+(-[cn]\\s+\\d+\\s+)?" + a.gw.replace(/\./g, "\\.") + "$"))) return V((linux ? "ping -c 4 " : "ping ") + a.gw, "Erreicht der Rechner sein Standardgateway?");
      return null;
    }
    if (s.art === "fw") {
      if (s.modus === "fwUser") return V("enable", "In den privilegierten Modus wechseln.");
      if (!schon(/^sh\w*\s+run/)) return V("show running-config", "Regeln, Zonen und NAT der Firewall ansehen.");
      return null;
    }
    if (s.art !== "ios") return null;
    const k = g.running, sw = g.typ === "switch";
    switch (s.modus) {
      case "abgemeldet": return V("", "Enter drücken, um dich wieder anzumelden.");
      case "user": return V("enable", "In den privilegierten Modus wechseln (der Prompt endet dann auf #).");
      case "priv":
        if (!schon(/^sh\w*\s+ip\s+int/)) return V("show ip interface brief", "Überblick: jede Schnittstelle mit Adresse und Status.");
        if (Modell.ungespeichert(g) && schon(/^(conf|do\s)/)) return V("copy running-config startup-config", "Änderungen dauerhaft sichern – sonst sind sie nach einem Neustart weg.");
        return V("configure terminal", "In den Konfigurationsmodus wechseln (kurz: conf t).");
      case "config": {
        if (k.hostname === Modell.NAMEN[g.typ]) return V(`hostname ${g.typ === "router" ? "R1" : "SW1"}`, "Dem Gerät einen Namen geben (steht danach im Prompt).");
        if (!sw) {
          const aus = Modell.PORTS.router.find(p => k.if[p] && k.if[p].shutdown && Modell.kabelAn(s.netz, s.id, p));
          if (aus) return V(`interface ${h.langName(aus)}`, "Diese Schnittstelle hat ein Kabel, ist aber abgeschaltet. Zum Konfigurieren auswählen.");
        }
        return V("end", "Zurück in den privilegierten Modus (#).");
      }
      case "if": case "subif": case "range": {
        const name = (s.kontext.ifs || [])[0]; if (!name) return V("exit", "");
        const art = h.ifArt(g, name), ik = h.ifKonfig(g, name) || {};
        if (art === "sub" && ik.vlan == null) return V(`encapsulation dot1Q ${name.split(".")[1]}`, "Welches VLAN gehört zu diesem Subinterface? (802.1Q-Tag)");
        if (art !== "port" && !ik.ip) return V("ip address ", "Adresse und Maske eintragen, z. B. ip address 192.168.1.1 255.255.255.0");
        if (ik.shutdown) return V("no shutdown", "Schnittstelle einschalten (ab Werk sind Router-Ports aus).");
        if (art === "port" && ik.modus === "access" && Number(ik.accessVlan) === 1 && Object.keys(g.flash.vlans || {}).length > 1)
          return V("switchport access vlan ", "Port einem VLAN zuordnen, z. B. switchport access vlan 10");
        return V("exit", "Zurück in den globalen Konfigurationsmodus.");
      }
      case "vlan": {
        const v = (s.kontext.vlans || [])[0], name = v && ((g.flash.vlans || {})[v] || {}).name;
        if (name && /^VLAN\d{4}$/.test(name)) return V("name ", "Dem VLAN einen sprechenden Namen geben, z. B. name Verwaltung");
        return V("exit", "VLAN-Modus verlassen.");
      }
      case "line": {
        const l = (k.lines || {})[s.kontext.line] || {};
        if (!l.passwort) return V("password ", "Passwort für diesen Zugang setzen.");
        if (!l.login) return V("login", "Beim Anmelden nach dem Passwort fragen.");
        return V("exit", "");
      }
      case "dhcp": {
        const p = ((k.dhcp || {}).pools || []).find(x => x.name === s.kontext.pool) || {};
        if (!p.netz) return V("network ", "Aus welchem Netz vergeben? z. B. network 192.168.10.0 255.255.255.0");
        if (!p.gw) return V("default-router ", "Gateway für die Clients, z. B. default-router 192.168.10.1");
        if (!p.dns) return V("dns-server ", "DNS-Server für die Clients.");
        return V("exit", "Pool fertig – zurück in den globalen Modus.");
      }
      case "std": case "ext": {
        const a = (k.acls || {})[s.kontext.acl];
        if (!a || !a.regeln.length) return V(s.modus === "std" ? "permit " : "deny ", "Erste Regel eintragen. Denk an das unsichtbare „deny any“ am Ende.");
        return V("exit", "Liste fertig – zurück in den globalen Modus.");
      }
    }
    return null;
  };
})();
