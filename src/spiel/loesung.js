"use strict";
/* ---------- Lösungsschritte und Fehler anwenden (headless) ----------
   Schritt-Formen (Architektur § 7.1, erweitert):
     {geraet, setzen:{pfad:wert, …}, text}                     Konfiguration setzen (Modell.setzen)
     {geraet, cli:"conf t\n…\nend", text}                        Befehlsblock über die Konsole (CLI.anwenden)
     {aktion:"verbinden", a:{geraet, port?}, b:{geraet, port?}, text}
     {aktion:"trennen", a:{geraet, port}, text}                  Kabel an diesem Port ziehen
     {aktion:"an"|"aus"|"neustart"|"speichern", geraet, text}
     {aktion:"vlan", geraet, nr, name|null, text}               VLAN-Datenbank (flash:vlan.dat)
     {aktion:"errdisable", geraet, port, text}                  err-disabled aufheben (shutdown/no shutdown)
   Spiel.fehlerAnwenden(netz, fehler, z): def.fehler [{injektor, auf, param}] über Spiel.INJEKTOREN. */
Spiel.schrittAnwenden = function(netz, s){
  if (!s) return;
  if (s.setzen) for (const [pfad, wert] of Object.entries(s.setzen)) {
    if (wert === undefined) Modell.loeschen(netz, s.geraet, pfad);
    else Modell.setzen(netz, s.geraet, pfad, wert);
  }
  if (s.cli) {
    if (typeof CLI === "undefined" || typeof CLI.anwenden !== "function") throw new Error("Konsole (CLI.anwenden) fehlt");
    const r = CLI.anwenden(netz, s.geraet, s.cli);
    if (r && r.ok === false) throw new Error(`CLI auf ${s.geraet}: ` + (r.fehler || []).map(f => `${f.zeile}: ${f.meldung}`).join("; "));
  }
  if (s.terminal) {
    /* Terminal-Schritt (C4): Befehle in einer Windows-/Linux-Sitzung auf dem Gerät, z. B. netsh oder sudo systemctl */
    if (typeof CLI === "undefined" || typeof CLI.sitzung !== "function") throw new Error("Terminal (CLI.sitzung) fehlt");
    const sitzung = CLI.sitzung(netz, s.geraet, {});
    for (const zeile of String(s.terminal).split("\n").filter(z => z.trim())) {
      const r = CLI.eingabe(sitzung, zeile);
      if (r && r.fehler) throw new Error(`Terminal auf ${s.geraet}: ${zeile} → ${String(r.ausgabe || "").split("\n")[0]}`);
    }
  }
  switch (s.aktion) {
    case undefined: case null: break;
    case "verbinden": {
      const k = Modell.verbinden(netz, s.a, s.b);
      if (k && k.fehler) throw new Error("Verbinden: " + k.fehler);
      break;
    }
    case "trennen": {
      const k = Modell.kabelAn(netz, s.a.geraet, s.a.port);
      if (k) Modell.trennen(netz, k.kabel.id);
      break;
    }
    case "an": Modell.geraetSetzen(netz, s.geraet, "an", true); break;
    case "aus": Modell.geraetSetzen(netz, s.geraet, "an", false); break;
    case "neustart": Modell.neustart(netz, s.geraet); break;
    case "speichern": Modell.speichern(netz.geraete[s.geraet]); break;
    case "erklaeren": break;                          /* Rechenweg ohne Netzänderung (Adressplan) – nur für die Vorführung */
    case "vlan": Modell.vlan(netz, s.geraet, s.nr, s.name === undefined ? "" : s.name); break;
    case "errdisable": { const z = netz.zustand?.[s.geraet]; if (z?.errdisabled) delete z.errdisabled[s.port]; break; }
    default: throw new Error("Unbekannte Aktion: " + s.aktion);
  }
};
Spiel.loesungAnwenden = function(netz, loesung){
  for (const s of loesung || []) Spiel.schrittAnwenden(netz, s);
  return netz;
};
Spiel.fehlerAnwenden = function(netz, fehler, z){
  for (const f of fehler || []) {
    const inj = Spiel.INJEKTOREN && Spiel.INJEKTOREN[f.injektor];
    if (!inj) throw new Error("Unbekannter Injektor: " + f.injektor);
    inj.anwenden(netz, f.auf, f.param || {}, z || Zufall(1));
  }
  return netz;
};
/* Kurzbeschreibung eines Schritts für Anzeige/Vorführung */
Spiel.schrittText = function(netz, s){
  if (s.text) return s.text;
  const n = id => netz.geraete[id]?.name || id;
  if (s.setzen) return `${n(s.geraet)}: ` + Object.entries(s.setzen).map(([p, w]) => `${p} = ${JSON.stringify(w)}`).join(", ");
  if (s.cli) return `${n(s.geraet)}: ${s.cli.split("\n").length} Befehle in der Konsole`;
  if (s.terminal) return `${n(s.geraet)}: im Terminal ${s.terminal.split("\n")[0]}`;
  if (s.aktion === "verbinden") return `Kabel von ${n(s.a.geraet)} zu ${n(s.b.geraet)}`;
  return `${s.aktion} ${n(s.geraet)}`;
};
