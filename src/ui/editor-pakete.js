"use strict";
/* ---------- Netz-Editor: Pakete auf der Fläche, Hervorheben, Ping-Gummiband ----------
   Die UI rechnet nichts nach – sie spielt nur ab, was die Simulation in der Trace aufgezeichnet hat (Architektur § 5.2).
   UI.laborPakete.einrichten(Z, F) hängt an F: hervorheben, animiere, abspielen, zeigeTrace, ping.
   UI.laborPakete.kurz(ereignis)   → kurze Beschriftung („ARP ?“, „ICMP Echo“, „DHCP Discover“ …) */
UI.laborPakete = (() => {
  const PROTO = {ARP: "arp", ICMP: "icmp", TCP: "tcp", UDP: "udp", DHCP: "dhcp", DNS: "dns", HTTP: "http"};
  const farbe = proto => PROTO[proto] ? `var(--p-${PROTO[proto]})` : "var(--accent)";
  function kurz(e){
    const f = e && e.frame || {};
    if (f.app?.info) return f.app.info.length > 18 ? f.app.info.slice(0, 17) + "…" : f.app.info;
    if (f.arp) return f.arp.op === "reply" ? "ARP !" : "ARP ?";
    if (f.icmp) return {"echo-request": "ICMP Echo", "echo-reply": "ICMP Antwort", unreachable: "ICMP unerreichbar", "time-exceeded": "ICMP TTL 0"}[f.icmp.typ] || "ICMP";
    if (f.tcp) return "TCP " + (f.tcp.flags || []).join("+");
    return e.proto || "Paket";
  }
  /* kleiner Tween mit rAF; bei wenig Bewegung sofort fertig */
  function tween(ms, fn){
    return new Promise(res => {
      if (ms <= 0) { fn(1); return res(); }
      const t0 = performance.now();
      const s = t => { const p = Math.min(1, (t - t0) / ms); fn(p); if (p < 1) requestAnimationFrame(s); else res(); };
      requestAnimationFrame(s);
    });
  }
  const glatt = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  function einrichten(Z, F){
    const bewegung = () => UI.bewegung ? UI.bewegung() : (wenigBewegung() ? "reduziert" : "voll");
    const schicht = () => Z.s.pakete && Z.s.pakete.isConnected ? Z.s.pakete : null;

    function hervorheben(liste, ms = 1500){
      const s = schicht(); if (!s || !Array.isArray(liste)) return;
      for (const x of liste) {
        const p = x && F.pos(x.geraet); if (!p) continue;
        const g = sv("g", {class: "hl"});
        g.append(sv("circle", {class: "hl-ring", cx: p.x, cy: p.y, r: 40}));
        if (x.port) {
          const ka = Modell.kabelAn(Z.netz, x.geraet, x.port), geo = ka && F.kabelGeo(ka.kabel);
          if (geo) {
            const r = ka.kabel.a.geraet === x.geraet ? 1 : -1, sx = r > 0 ? geo.ax : geo.bx, sy = r > 0 ? geo.ay : geo.by, d = Math.min(46, geo.len * 0.3);
            g.append(sv("circle", {class: "hl-port", cx: sx + geo.ux * d * r, cy: sy + geo.uy * d * r, r: 11}));
          }
        }
        s.append(g);
        setTimeout(() => g.remove(), ms);
      }
      if (liste.length === 1 && liste[0]?.geraet && !Z.ziehen) F.sichtbarMachen(liste[0].geraet);
    }

    /* ---------- ein Ereignis animieren ---------- */
    function weg(e){
      const k = Z.netz.kabel.find(k => (k.a.geraet === e.geraet && k.a.port === e.port && k.b.geraet === e.nach.geraet) ||
                                       (k.b.geraet === e.geraet && k.b.port === e.port && k.a.geraet === e.nach.geraet))
             || Z.netz.kabel.find(k => (k.a.geraet === e.geraet && k.b.geraet === e.nach.geraet) || (k.b.geraet === e.geraet && k.a.geraet === e.nach.geraet));
      if (k) {
        const geo = F.kabelGeo(k); if (!geo) return null;
        return k.a.geraet === e.geraet ? [geo.ax, geo.ay, geo.bx, geo.by] : [geo.bx, geo.by, geo.ax, geo.ay];
      }
      const A = F.pos(e.geraet), B = F.pos(e.nach.geraet);
      return A && B ? [A.x, A.y, B.x, B.y] : null;
    }
    function animiere(e, o = {}){
      const s = schicht(); if (!s || !e || !Z.netz) return Promise.resolve();
      if (e.art === "verwerfen") return platzen(e.geraet, e.grund);
      if (e.art !== "senden" || !e.nach) { if (e.geraet) puls(e.geraet, farbe(e.proto)); return Promise.resolve(); }
      const w = weg(e); if (!w) return Promise.resolve();
      const [x1, y1, x2, y2] = w, ms = o.ms ?? 620, bw = bewegung();
      const g = sv("g", {class: "paket", style: `--pf:${farbe(e.proto)}`});
      g.append(sv("circle", {class: "paket-schein", r: 12}), sv("circle", {class: "paket-kern", r: 6}));
      if (o.beschriften !== false) g.append(sv("text", {class: "paket-text", x: 0, y: -13, "text-anchor": "middle", text: kurz(e)}));
      s.append(g);
      if (bw !== "voll") {
        g.setAttribute("transform", `translate(${(x1 + x2) / 2} ${(y1 + y2) / 2})`);
        return tween(bw === "aus" ? 0 : Math.min(ms, 450), p => { g.style.opacity = String(1 - p * p); }).then(() => g.remove());
      }
      return tween(ms, p => {
        const q = glatt(p);
        g.setAttribute("transform", `translate(${(x1 + (x2 - x1) * q).toFixed(1)} ${(y1 + (y2 - y1) * q).toFixed(1)})`);
        g.style.opacity = p > .92 ? String((1 - p) / .08) : "1";
      }).then(() => g.remove());
    }
    function puls(id, f){
      const s = schicht(), p = F.pos(id); if (!s || !p || bewegung() === "aus") return;
      const c = sv("circle", {class: "puls", cx: p.x, cy: p.y, r: 30, style: `--pf:${f}`});
      s.append(c);
      tween(bewegung() === "voll" ? 600 : 300, q => { c.setAttribute("r", String(30 + q * 22)); c.style.opacity = String(.8 * (1 - q)); }).then(() => c.remove());
    }
    function erfolg(id){
      const s = schicht(), p = F.pos(id); if (!s || !p) return Promise.resolve();
      const el = Z.gEl.get(id); el?.classList.add("blitz-ok"); setTimeout(() => el?.classList.remove("blitz-ok"), 1100);
      if (bewegung() === "aus") return Promise.resolve();
      const ringe = [0, 140].map(v => { const c = sv("circle", {class: "ring-ok", cx: p.x, cy: p.y, r: 34}); s.append(c); return [c, v]; });
      return Promise.all(ringe.map(([c, v]) => new Promise(r => setTimeout(r, v)).then(() =>
        tween(bewegung() === "voll" ? 700 : 350, q => { c.setAttribute("r", String(34 + q * 34)); c.style.opacity = String(1 - q); }).then(() => c.remove()))));
    }
    function platzen(id, grund){
      const s = schicht(), p = F.pos(id); if (!s || !p) return Promise.resolve();
      const el = Z.gEl.get(id); el?.classList.add("blitz-fehler"); setTimeout(() => el?.classList.remove("blitz-fehler"), 1400);
      const titel = grund ? F.grundText(grund) : "";
      if (titel) {
        const t = sv("g", {class: "platz-schild"});
        const b = titel.length * 6.6 + 30;
        t.append(sv("rect", {x: p.x - b / 2, y: p.y - 74, width: b, height: 22, rx: 11}), sv("text", {x: p.x, y: p.y - 59, "text-anchor": "middle", text: "✗ " + titel}));
        s.append(t);
        setTimeout(() => t.remove(), 2600);
      }
      if (bewegung() === "aus") return Promise.resolve();
      const ring = sv("circle", {class: "ring-fehler", cx: p.x, cy: p.y, r: 20}); s.append(ring);
      const teile = [];
      if (bewegung() === "voll") for (let i = 0; i < 10; i++) { const c = sv("circle", {class: "splitter", cx: p.x, cy: p.y, r: 3}); s.append(c); teile.push([c, i / 10 * Math.PI * 2 + .3]); }
      return tween(bewegung() === "voll" ? 650 : 320, q => {
        const e = 1 - Math.pow(1 - q, 3);
        ring.setAttribute("r", String(20 + e * 38)); ring.style.opacity = String(1 - q);
        for (const [c, w] of teile) { c.setAttribute("cx", String(p.x + Math.cos(w) * e * 44)); c.setAttribute("cy", String(p.y + Math.sin(w) * e * 44)); c.style.opacity = String(1 - q); }
      }).then(() => { ring.remove(); for (const [c] of teile) c.remove(); });
    }

    /* ---------- ganze Trace abspielen ---------- */
    let marke = 0;
    function erfolgreich(trace){
      if (typeof UI.simpanel?.erfolg === "function") { try { return !!UI.simpanel.erfolg(trace); } catch { /* weiter */ } }
      return !trace.abbruch && !(trace.ereignisse || []).some(e => e.art === "verwerfen");
    }
    async function abspielen(trace, o = {}){
      if (!trace || !Array.isArray(trace.ereignisse) || !schicht()) return;
      const m = ++marke;
      Z.s.pakete.replaceChildren();
      const sends = trace.ereignisse.filter(e => e.art === "senden" && e.nach);
      const gruppen = [];
      for (const e of sends) { const l = gruppen[gruppen.length - 1]; if (l && l[0].t === e.t && e.t != null) l.push(e); else gruppen.push([e]); }
      /* die ersten Etappen in Ruhe (man soll den Weg sehen), Wiederholungen (Ping 2–4) zügig */
      const MAXG = 70, zeig = gruppen.slice(0, MAXG), RUHIG = 8;
      const langsam = klemme(2400 / Math.max(1, Math.min(RUHIG, zeig.length)), 240, 460), schnell = 90;
      if (bewegung() === "voll") for (let i = 0; i < zeig.length; i++) {
        if (m !== marke || !schicht()) return;
        const gr = zeig[i], ms = i < RUHIG ? langsam : schnell;
        await Promise.all(gr.slice(0, 30).map(e => animiere(e, {ms, beschriften: gr.length < 5 && i < RUHIG})));
      }
      if (m !== marke) return;
      const ok = o.ok != null ? o.ok : erfolgreich(trace);
      if (ok) {
        const ziel = o.ziel || [...trace.ereignisse].reverse().find(e => e.art === "empfangen" || e.art === "antworten")?.geraet;
        if (ziel) await erfolg(ziel);
      } else {
        const v = [...trace.ereignisse].reverse().find(e => e.art === "verwerfen");
        const letzt = sends[sends.length - 1];
        const ort = v?.geraet || o.ziel || letzt?.nach?.geraet;
        if (ort) await platzen(ort, v?.grund || o.grund || (trace.abbruch ? "STORM" : "TIMEOUT"));
      }
    }
    function zeigeTrace(trace, o = {}){
      if (!trace) return;
      F.simUmschalten(false);
      const c = Z.el.sim;
      if (c) {
        if (typeof UI.simpanel?.zeigen === "function") { try { UI.simpanel.zeigen(c, trace); } catch (e) { console.error("Simulations-Panel", e); } }
        else c.replaceChildren(h("div", {class: "lb-sim-platz"}, h("strong", {}, trace.zusammenfassung || "Aufzeichnung"),
          h("p", {}, `${(trace.ereignisse || []).length} Ereignisse. Das ausführliche Simulations-Panel wird gerade eingebaut.`)));
      }
      if (Z.el.simTitel) Z.el.simTitel.textContent = "Simulation" + (trace.zusammenfassung ? " · " + trace.zusammenfassung : "");
      Bus.senden("trace", {trace, quelle: o.quelle || "labor"});
      if (o.abspielen !== false) abspielen(trace, o);
    }

    /* ---------- Ping-Gummiband ---------- */
    function zielAdresse(netz, A, B){
      const eigene = UI.ebenen.alleAdressen(netz, A), fremde = UI.ebenen.alleAdressen(netz, B);
      for (const f of fremde) if (eigene.some(e => IP.gleichesNetz(e.ip, f.ip, e.maske))) return f.ip;
      return fremde[0]?.ip || UI.ebenen.adresse(netz, B).ip || null;
    }
    function ping(vonId, nachId){
      const netz = Z.netz, A = netz?.geraete[vonId];
      /* Ziel: Geräte-ID, oder direkt eine IP-Adresse bzw. ein Name (DNS), z. B. aus der Befehlspalette */
      const B = netz?.geraete[nachId] || (typeof nachId === "string" && nachId ? {id: null, name: nachId, frei: true} : null);
      if (!A || !B || vonId === nachId) return null;
      F.werkzeugAnzeigen?.();
      if (typeof Sim === "undefined" || typeof Sim.ping !== "function") {
        UI.toast(`Ping ${A.name} → ${B.name}: Die Simulation wird gerade eingebaut. Sobald sie da ist, fliegt hier das Paket.`, "info", {id: "ping"});
        return null;
      }
      const ip = B.frei ? nachId : zielAdresse(netz, A, B);
      if (!ip) { UI.toast(`${B.name} hat keine IP-Adresse. Ein Ping braucht eine Zieladresse – trag im Inspektor eine ein.`, "warn", {id: "ping", titel: `Ping ${A.name} → ${B.name}`}); return null; }
      let r;
      try { r = Sim.ping(netz, vonId, ip, {anzahl: 4}); }
      catch (e) { console.error("Sim.ping", e); UI.toast(`Die Simulation ist über diesen Fall gestolpert (${e.message || e}).`, "fehler", {id: "ping"}); return null; }
      if (!r) return null;
      F.neuZeichnen();                          /* MAC-Tabellen/ARP haben sich geändert */
      const antw = Array.isArray(r.antworten) ? r.antworten : [];
      const n = antw.length || 4, ok = antw.filter(a => a && a.ok).length;
      const grund = antw.find(a => a && !a.ok && a.grund)?.grund || [...(r.trace?.ereignisse || [])].reverse().find(e => e.grund)?.grund || null;
      const gemeldet = (r.trace?.ereignisse || []).some(e => e.frame?.icmp?.typ === "unreachable" || e.frame?.icmp?.typ === "time-exceeded");
      const titel = B.frei ? `Ping ${A.name} → ${ip}` : `Ping ${A.name} → ${B.name} (${ip})`;
      let text, art;
      if (ok === n && ok > 0) { text = `✓ ${ok}/${n} Antworten`; art = "ok"; }
      else if (ok > 0) { text = `▲ ${ok}/${n} Antworten${grund ? " – " + F.grundText(grund) : ""}`; art = "warn"; }
      else { text = `✗ ${gemeldet ? "Ziel nicht erreichbar" : "Zeitüberschreitung"}${grund ? " – " + F.grundText(grund) : ""}`; art = "fehler"; }
      const aktion = r.trace ? {text: "In Simulation öffnen", fn: () => zeigeTrace(r.trace, {ok: ok > 0, ziel: B.frei ? undefined : nachId, grund, quelle: "ping"})} : null;
      Bus.senden("trace", {trace: r.trace, quelle: "ping", von: vonId, nach: nachId, ergebnis: r});
      const melden = () => UI.toast(text, art, {id: "ping", titel, aktion});
      if (r.trace && bewegung() === "voll") {
        let gemeldetSchon = false;
        const t = setTimeout(() => { gemeldetSchon = true; melden(); }, 4800);
        abspielen(r.trace, {ok: ok > 0, ziel: B.frei ? undefined : nachId, grund}).then(() => { if (!gemeldetSchon) { clearTimeout(t); melden(); } });
      } else { melden(); if (r.trace) abspielen(r.trace, {ok: ok > 0, ziel: B.frei ? undefined : nachId, grund}); }
      return r;
    }

    Object.assign(F, {hervorheben, animiere, abspielen, zeigeTrace, ping, erfolgEffekt: erfolg, platzen});
  }
  return {einrichten, kurz};
})();
