"use strict";
/* ---------- Spiel: Funktionsprobe (Design – Spielspaß 2.0, Hebel 1; Architektur § 9.2) ----------
   Nach bestandener Abnahme soll man SEHEN, dass das Netz wieder funktioniert: je Ziel fährt ein Paket den echten Weg
   (aus der Trace der Abnahme), und das Endgerät reagiert (Drucker druckt, Seite lädt, Adresse erscheint, Sperre greift).
   Hier nur die Daten, ohne DOM – die Oberfläche spielt ab (ui/szene.js).

   Spiel.szene(inst|netz, abnahme) → [{ziel, art, pfad:[geraeteId], von, ende, text}]
     art: "druckt" | "seite" | "adresse" | "gesperrt" | "haken" | "sicherung"
   Spiel.geaenderteGeraete(inst) → [geraeteId]   Diff gegen das Startnetz: Konfig, Strom, startup, Flash, Kabel, neue Geräte */

/* Welches Paket ist „die Anfrage“ des Ziels? (erste Sendung des Absenders, die zum Ziel passt) */
Spiel.szeneFluss = function(ziel){
  const port = +ziel.port || null;
  if (ziel.typ === "dhcp") return f => !!(f.app && f.app.proto === "DHCP");
  if (ziel.proto === "dns") return f => !!(f.app && f.app.proto === "DNS");
  if (ziel.proto === "http") return f => !!(f.tcp && (f.tcp.dst === 80 || f.tcp.dst === 443) && (f.tcp.flags || []).includes("SYN"));
  if (ziel.proto === "tcp") return f => !!(f.tcp && (!port || f.tcp.dst === port) && (f.tcp.flags || []).includes("SYN"));
  if (ziel.proto === "udp") return f => !!(f.udp && (!port || f.udp.dst === port));
  if (ziel.proto === "icmp") return f => !!(f.icmp && f.icmp.typ === "echo-request");
  return f => !!(f.ip && !(f.app && (f.app.proto === "DHCP" || f.app.proto === "DNS")) && !f.arp);
};

/* Kürzester Weg im Graphen der Sendungen (Kanten geraet → nach.geraet) */
Spiel.szeneWeg = function(kanten, von, ende){
  if (von === ende) return [von];
  const vor = new Map([[von, null]]), schlange = [von];
  while (schlange.length) {
    const a = schlange.shift();
    for (const b of kanten.get(a) || []) {
      if (vor.has(b)) continue;
      vor.set(b, a);
      if (b === ende) { const weg = [b]; let x = a; while (x != null) { weg.unshift(x); x = vor.get(x); } return weg; }
      schlange.push(b);
    }
  }
  return null;
};

/* Pfad und Endgerät eines Ziels aus seiner Trace */
Spiel.szenePfad = function(netz, ziel, trace){
  const von = ziel.von || ziel.geraet;
  const nachGeraet = netz.geraete[ziel.nach] ? ziel.nach : null;
  const leer = {pfad: von ? [von] : [], ende: nachGeraet || von || null, ereignis: null};
  if (!von || !trace || !Array.isArray(trace.ereignisse)) return leer;
  const ev = trace.ereignisse, passt = Spiel.szeneFluss(ziel);
  const erstes = ev.find(e => e.art === "senden" && e.geraet === von && e.frame && passt(e.frame));
  if (!erstes) return leer;
  const kanten = new Map(), kante = (a, b) => { if (!a || !b || a === b) return; if (!kanten.has(a)) kanten.set(a, []); if (!kanten.get(a).includes(b)) kanten.get(a).push(b); };
  let ende = null, ereignis = null;
  if (ziel.typ === "dhcp") {
    /* Broadcast und Relay ändern die Adressen – der Fluss ist „alles DHCP“; Ende = wer das Angebot schickt */
    for (const e of ev) if (e.art === "senden" && e.nach && e.frame && passt(e.frame)) { kante(e.geraet, e.nach.geraet); kante(e.nach.geraet, e.geraet); }
    const angebot = ev.find(e => e.art === "senden" && e.frame && e.frame.app && /offer/i.test(e.frame.app.info || ""));
    ende = angebot ? angebot.geraet : null;
    ereignis = [...ev].reverse().find(e => e.frame && e.frame.app && e.frame.app.proto === "DHCP" && /ack/i.test(e.frame.app.info || "")) || angebot;
  } else {
    /* dasselbe Paket über alle Stationen: gleiche IP-Kennung (übersteht NAT), sonst gleiche Zieladresse.
       Das erste Paket verwirft ein Router oft regulär, solange ARP läuft – zählt also das erste, das ankommt
       (bzw. bei „blockiert“ das erste, das an einer Regel hängen bleibt). */
    for (const k of ev.filter(e => e.art === "senden" && e.geraet === von && e.frame && passt(e.frame))) {
      const ip = k.frame.ip || {};
      const gleich = f => !!f && !!f.ip && (ip.id != null ? f.ip.id === ip.id && f.ip.proto === ip.proto : f.ip.dst === ip.dst);
      const eigene = new Map(), dazu = (a, b) => { if (!a || !b || a === b) return; if (!eigene.has(a)) eigene.set(a, []); if (!eigene.get(a).includes(b)) eigene.get(a).push(b); };
      for (const e of ev) if (e.art === "senden" && e.nach && gleich(e.frame)) dazu(e.geraet, e.nach.geraet);
      const treffer = ziel.typ === "blockiert" ? ev.find(e => e.art === "verwerfen" && e.grund && gleich(e.frame))
        : ev.find(e => (e.art === "antworten" || e.art === "empfangen") && gleich(e.frame));
      const weg = treffer && netz.geraete[treffer.geraet] ? Spiel.szeneWeg(eigene, von, treffer.geraet) : null;
      if (weg) return {pfad: weg.filter(id => netz.geraete[id]), ende: treffer.geraet, ereignis: treffer};
      if (!kanten.size) for (const [a, l] of eigene) for (const b of l) kante(a, b);    /* Rückfall: Kette des ersten Pakets */
    }
    ende = ziel.typ === "blockiert" ? null : nachGeraet;
  }
  if (!ende || !netz.geraete[ende]) {
    /* ohne erkennbares Ende: der Kette des Pakets folgen, so weit sie reicht */
    const weg = [von]; let x = von;
    for (let i = 0; i < 30; i++) { const n = (kanten.get(x) || []).find(b => !weg.includes(b)); if (!n) break; weg.push(n); x = n; }
    return {pfad: weg.filter(id => netz.geraete[id]), ende: weg[weg.length - 1], ereignis};
  }
  const weg = Spiel.szeneWeg(kanten, von, ende) || [von, ende];
  return {pfad: weg.filter(id => netz.geraete[id]), ende, ereignis};
};

Spiel.szeneArt = function(netz, ziel, ende){
  if (ziel.typ === "blockiert") return "gesperrt";
  if (ziel.typ === "dhcp" || ziel.proto === "dns") return "adresse";
  if (ziel.typ === "gespeichert") return "sicherung";
  if (ziel.typ === "konfig" || Spiel.istArbeitsziel(ziel)) return "haken";
  const g = netz.geraete[ende];
  if (g && g.skin === "drucker" && ziel.proto !== "icmp") return "druckt";
  if (+ziel.port === 9100) return "druckt";
  if (ziel.proto === "http" || +ziel.port === 80 || +ziel.port === 443 || (g && g.typ === "internet")) return "seite";
  return "haken";
};

Spiel.szeneText = function(netz, ziel, art, ende, ereignis){
  const name = id => (netz.geraete[id] && netz.geraete[id].name) || id;
  const felder = (ereignis && ereignis.frame && ereignis.frame.app && ereignis.frame.app.felder) || {};
  switch (art) {
    case "druckt": return "Beleg kommt raus";
    case "seite": return ziel.proto === "http" ? `Seite lädt: ${ziel.nach}` : "Internet antwortet";
    case "adresse":
      if (ziel.typ === "dhcp") return felder.angeboten && felder.angeboten !== "0.0.0.0" ? `Adresse ${felder.angeboten}` : "Adresse bezogen";
      return `${ziel.name || ziel.nach} gefunden`;
    case "gesperrt": return "Gesperrt – wie gewünscht";
    case "sicherung": return "Konfiguration gesichert";
    default: return ziel.typ === "konfig" ? "Einstellung passt" : ziel.typ === "befehl" ? "Befehl ausgeführt" : ziel.typ === "antwort" ? "Antwort stimmt" : `${name(ende)} antwortet`;
  }
};

Spiel.szene = function(instOderNetz, abnahme){
  const netz = instOderNetz && instOderNetz.geraete ? instOderNetz : instOderNetz && instOderNetz.netz;
  if (!netz || !abnahme) return [];
  const zeilen = [];
  for (const e of abnahme.ergebnisse || []) {
    if (!e || e.ok !== true || !e.ziel) continue;
    const z = e.ziel;
    let pfad, ende, ereignis = null;
    if (z.typ === "konfig" || z.typ === "gespeichert") { pfad = netz.geraete[z.geraet] ? [z.geraet] : []; ende = z.geraet; }
    else if (Spiel.istArbeitsziel(z)) { ende = z.geraet || (z.pruefen || {}).geraet; pfad = netz.geraete[ende] ? [ende] : []; }
    else ({pfad, ende, ereignis} = Spiel.szenePfad(netz, z, e.trace));
    if (!pfad.length || !netz.geraete[ende]) continue;
    const art = Spiel.szeneArt(netz, z, ende);
    zeilen.push({ziel: z, art, pfad, von: pfad[0], ende, text: Spiel.szeneText(netz, z, art, ende, ereignis)});
  }
  return zeilen;
};

/* Was hat der Spieler verändert? (für das kurze Vorher/Nachher-Pulsieren) */
Spiel.geaenderteGeraete = function(inst){
  const start = Spiel.startNetzVon(inst), netz = inst.netz;
  const kabel = (n, id) => n.kabel.filter(k => k.a.geraet === id || k.b.geraet === id)
    .map(k => [k.a.geraet + ":" + k.a.port, k.b.geraet + ":" + k.b.port].sort().join("|")).sort().join(",");
  const json = x => JSON.stringify(x == null ? null : x);
  const ids = [];
  for (const [id, g] of Object.entries(netz.geraete)) {
    const s = start.geraete[id];
    if (!s || !Modell.gleich(s.running, g.running) || s.an !== g.an || json(s.startup) !== json(g.startup) || json(s.flash) !== json(g.flash) || kabel(start, id) !== kabel(netz, id)) ids.push(id);
  }
  return ids;
};
