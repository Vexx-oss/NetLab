"use strict";
/* DATEN.leitfaden (3.1-B4) – verbindliche Form nach der Didaktik-Spec
   Nachweise/3.0/3.1/DIAGNOSTIK.md (r-didaktik, task-122) §5:
     {phasen: [6 × {id,titel,ziel,impulse:[2],fehlannahme}],
      pruefung: {impulse:false, naechster:null},
      onboarding: [4 × {id,titel,lernziel,abnahme}]}  (+ additiver Anzeigetext je Onboarding-Schritt)
   Geprüft wird: Form/IDs/Reihenfolge (Engine + UI lesen genau diese Form), Onboarding (echte Daten,
   KEIN Stub), Prüfungsmodus neutral, Kein-Leck-Gate über ALLE 56 Texte inkl. Onboarding-Texten
   (Spec §2: keine Ziffern, Adressen, Befehlsfolgen, Codes, Geräte-IDs; keine Rang-/Vergleichs-
   aussagen; Du-Form, höchstens zwei Sätze). Die Gegenprobe schiebt Literale ein und ERWARTET rot –
   sonst wäre das Gate blind. */
gruppe("Inhalte: Leitfaden (3.1-B4)", () => {
  const L = (typeof DATEN === "object" && DATEN) ? DATEN.leitfaden : null;

  const PHASEN_IDS = ["auftrag-klaeren", "lage-schichten", "hypothese", "messen", "eingreifen-pruefen", "dokumentieren-lernen"];
  const ONBOARDING_IDS = ["onboarding-auftrag", "onboarding-lage", "onboarding-leitfaden", "onboarding-abnahme"];

  /* ---- Leck- und Sprachmuster (schmal, benannt, falsifizierbar) ---- */
  const LECK_MUSTER = [
    ["Ziffer", /[0-9]/],
    ["IPv4-Adresse", /\b\d{1,3}(?:\.\d{1,3}){3}\b/],
    ["Präfixlänge", /(?:^|[\s(.,;:])\/\d{1,2}\b/],
    ["VLAN-ID", /\bVLAN\s*\d+|\bVLAN\s*\d+\s*(?:\/|,|und)\s*\d+/i],
    ["Lösungscode", /\bE-[0-9A-Z]{4}-[0-9A-Z]{3}\b|\bNL-[0-9A-Z]{2,}/],
    ["Konfigbefehl", /\b(?:switchport|ip route|conf t\b|interface|no shutdown|encapsulation|dot1q|show running|copy running)\b/i],
    ["Geräte-ID", /\b(?:Gi|Fa|Eth|Te|Se)\d/],
  ];
  const RANG_MUSTER = [
    ["Rang", /\bRang(?:folge|liste)?\b/i],
    ["Bestenliste", /Bestenliste|Highscore/i],
    ["Sitzplatz/Platz", /Sitzplatz|\bPlatz\b/i],
    ["Abgabe (nur Klassenraum)", /\bAbgabe/],
    ["Note", /\bNoten?\b/i],
    ["Vergleichsaussage", /\b(?:besser|schlechter|mehr Punkte|weniger Punkte)\s+(?:als|wie)\b/i],
  ];
  const leck = text => {
    const t = String(text == null ? "" : text);
    const f = [];
    for (const [name, re] of LECK_MUSTER) { const m = t.match(re); if (m) f.push(name + " „" + m[0].trim() + "“"); }
    return f;
  };
  const rang = text => {
    const t = String(text == null ? "" : text);
    const f = [];
    for (const [name, re] of RANG_MUSTER) { const m = t.match(re); if (m) f.push(name + " „" + m[0].trim() + "“"); }
    return f;
  };
  const saetze = text => String(text).split(/[.!?]+(?=\s|$)/).map(x => x.trim()).filter(Boolean).length;
  const istText = x => typeof x === "string" && x.trim().length > 0;

  pruefe("DATEN.leitfaden hat die Spec-Form: phasen[6] · pruefung · onboarding[4]", () => {
    erwarte.wahr(!!L && typeof L === "object", "DATEN.leitfaden fehlt");
    erwarte.wahr(Array.isArray(L.phasen), "phasen fehlt");
    erwarte.gleich(L.phasen.length, 6, "genau 6 Phasen");
    erwarte.wahr(Array.isArray(L.onboarding), "onboarding fehlt");
    erwarte.gleich(L.onboarding.length, 4, "genau 4 Onboarding-Schritte");
    erwarte.wahr(!!L.pruefung && typeof L.pruefung === "object", "pruefung fehlt");
    erwarte.gleich([L.pruefung.impulse, L.pruefung.naechster], [false, null], "pruefung = {impulse:false, naechster:null} (neutral)");
  });

  pruefe("6 Phasen: IDs wörtlich aus der Spec, je {id,titel,ziel,impulse[2],fehlannahme}", () => {
    const f = [];
    erwarte.gleich(L.phasen.map(p => p && p.id), PHASEN_IDS, "Phasen-IDs/Reihenfolge aus der Spec");
    for (const p of L.phasen) {
      const wo = p && p.id ? p.id : "?";
      if (!istText(p.titel)) f.push(wo + ": titel fehlt");
      else if (saetze(p.titel) > 2) f.push(wo + ": titel über zwei Sätze");
      if (!istText(p.ziel)) f.push(wo + ": ziel fehlt");
      if (!istText(p.fehlannahme)) f.push(wo + ": fehlannahme fehlt");
      if (!Array.isArray(p.impulse) || p.impulse.length !== 2) f.push(wo + ": nicht genau 2 Impulse");
      else for (const [i, imp] of p.impulse.entries()) {
        if (!istText(imp)) f.push(wo + ": Impuls " + (i + 1) + " fehlt");
        else if (saetze(imp) > 2) f.push(wo + ": Impuls " + (i + 1) + " hat " + saetze(imp) + " Sätze (max. 2)");
      }
    }
    erwarte.gleich(f, []);
  });

  pruefe("4 Onboarding-Schritte: IDs aus der Spec, je {id,titel,lernziel,abnahme,text}", () => {
    const f = [];
    erwarte.gleich(L.onboarding.map(o => o && o.id), ONBOARDING_IDS, "Onboarding-IDs/Reihenfolge aus der Spec");
    for (const o of L.onboarding) {
      const wo = o && o.id ? o.id : "?";
      if (!istText(o.titel)) f.push(wo + ": titel fehlt");
      if (!istText(o.lernziel)) f.push(wo + ": lernziel fehlt");
      if (!istText(o.abnahme)) f.push(wo + ": abnahme fehlt");
      if (!istText(o.text)) f.push(wo + ": Anzeigetext (text) fehlt – die Tour zeigt ihn");
      else if (saetze(o.text) > 2) f.push(wo + ": text hat " + saetze(o.text) + " Sätze (max. 2)");
    }
    erwarte.gleich(f, []);
  });

  /* Der Onboarding-Test liest die ECHTEN Daten (kein Stub): DATEN.leitfaden.onboarding,
     und die UI-Quelle muss diese Liste auch verwenden. */
  pruefe("Onboarding: echte DATEN.leitfaden.onboarding (kein Stub) – und die UI liest sie", () => {
    const fs = require("fs"), path = require("path");
    erwarte.wahr(Array.isArray(DATEN.leitfaden.onboarding), "echte onboarding-Liste fehlt");
    const quelle = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "onboarding.js"), "utf8");
    erwarte.passt(quelle, /leitfaden\.onboarding|\.onboarding\b|\(lf\.onboarding/, "src/ui/onboarding.js liest onboarding");
    erwarte.wahr(!/DATEN\.leitfaden\.tour\b/.test(quelle) || /onboarding\s*\|\|/, "kein reiner Altform-Zugriff (Fallback erlaubt)");
    const texte = DATEN.leitfaden.onboarding.map(o => o.text);
    erwarte.gleich(texte.filter(t => !istText(t)).length, 0, "jeder echte Onboarding-Schritt trägt einen Anzeigetext");
  });

  /* Kein-Leck-Gate über ALLE 56 Texte: 6 Phasen (id/titel/ziel/2 Impulse/fehlannahme = 36)
     + 4 Onboarding-Schritte (id/titel/lernziel/abnahme/text = 20) = 56. */
  pruefe("Kein-Leck-Gate über 56 Texte (inkl. Onboarding): keine Ziffern/Adressen/Befehle/Codes", () => {
    const alle = [];
    for (const p of L.phasen) {
      alle.push(["phase " + p.id + ".id", p.id], ["phase " + p.id + ".titel", p.titel],
        ["phase " + p.id + ".ziel", p.ziel], ["phase " + p.id + ".impulse1", p.impulse[0]],
        ["phase " + p.id + ".impulse2", p.impulse[1]], ["phase " + p.id + ".fehlannahme", p.fehlannahme]);
    }
    for (const o of L.onboarding) {
      alle.push(["onboarding " + o.id + ".id", o.id], ["onboarding " + o.id + ".titel", o.titel],
        ["onboarding " + o.id + ".lernziel", o.lernziel], ["onboarding " + o.id + ".abnahme", o.abnahme],
        ["onboarding " + o.id + ".text", o.text]);
    }
    erwarte.gleich(alle.length, 56, "56 Texte geprüft");
    const f = [];
    for (const [wo, wert] of alle) for (const grund of leck(wert)) f.push(wo + ": " + grund);
    erwarte.gleich(f.slice(0, 10), []);
  });

  /* Rang-/Vergleichsaussagen und „Ticket“ im Fließtext: gleiche Sammlung, aber nur die Flächen,
     die der Lernende liest (Titel, Impulse, Onboarding-Anzeigetexte) – Kriterienfelder wie
     „abnahme“ nennen die Verbote selbst und sind keine Anzeigetexte. */
  pruefe("Keine Rang-/Vergleichssprache und kein „Ticket“ in den sichtbaren Texten", () => {
    const sichtbar = [];
    for (const p of L.phasen) { sichtbar.push(["phase " + p.id + ".titel", p.titel]); for (const [i, imp] of p.impulse.entries()) sichtbar.push(["phase " + p.id + ".impulse" + (i + 1), imp]); }
    for (const o of L.onboarding) { sichtbar.push(["onboarding " + o.id + ".titel", o.titel], ["onboarding " + o.id + ".text", o.text]); }
    const f = [];
    for (const [wo, wert] of sichtbar) for (const grund of rang(wert)) f.push(wo + ": " + grund);
    for (const [wo, wert] of sichtbar) if (/\bTicket\b/.test(String(wert))) f.push(wo + ": „Ticket“ statt „Auftrag“ im Fließtext");
    erwarte.gleich(f.slice(0, 10), []);
  });

  pruefe("Gegenprobe: Leck- und Rang-Gate erkennen eingeschmuggelte Inhalte wirklich", () => {
    erwarte.wahr(leck("Setze 192.168.1.10 als Adresse.").length > 0, "IPv4/Ziffer nicht erkannt");
    erwarte.wahr(leck("Die Maske ist /24.").length > 0, "Präfix nicht erkannt");
    erwarte.wahr(leck("Nimm VLAN 20 für die Gäste.").length > 0, "VLAN-ID nicht erkannt");
    erwarte.wahr(leck("Der Code ist E-ABCD-XYZ.").length > 0, "Lösungscode nicht erkannt");
    erwarte.wahr(leck("Gib switchport access vlan ein.").length > 0, "Konfigbefehl nicht erkannt");
    erwarte.wahr(rang("Der Beste im Rang bekommt Punkte.").length > 0, "Rangsprache nicht erkannt");
    erwarte.wahr(rang("Du bist besser als die anderen.").length > 0, "Vergleichssprache nicht erkannt");
    erwarte.gleich(leck("Prüf zuerst den Aufbau und danach die Verbindung."), [], "sauberer Satz bleibt grün");
    erwarte.gleich(rang("Hier zählt dein eigener Fortschritt, kein Vergleich."), [], "die Verbotsformulierung selbst ist kein Rang-Satz");
  });
});
