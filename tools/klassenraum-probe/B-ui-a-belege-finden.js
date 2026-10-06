"use strict";
/* B-ui-a-belege-finden.js – findet die aktuellen Zeilennummern der zitierten A-Aussagen.
   Bereich A überarbeitet sein Dokument während dieser Sitzung; dieses Skript sucht die Textstücke
   im JETZIGEN Stand und gibt Datei:Zeile aus. Nur lesend.
   Aufruf: node B-ui-a-belege-finden.js                                                          */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const REL = "docs/entwicklung/Klassenraum/A – Codec und Determinismus.md";
const zeilen = fs.readFileSync(path.join(ROOT, REL), "utf8").replace(/\n$/, "").split(/\r?\n/);

/* Schlüssel -> Textstück, das in genau einer Zeile vorkommen muss */
const STUECKE = {
  "Auftragscode-Form": "NL-XXXX-XX       4 Nutzzeichen",
  "Ergebnis-Form": "E-XXXX-XXX      5 Nutzzeichen",
  "Laenge-10-auftrag": "über **alle 2^20 = 1.048.576**",
  "Laenge-10-ergebnis": "Der Ergebniscode ist ebenfalls **immer genau 10 Zeichen**",
  "Normalisierung": "**Groß-/Kleinschreibung, Trennstriche, Punkte und Leerzeichen sind egal.**",
  "Normalform-beispiele": "ergeben **alle** dieselben Felder",
  "Formbeispiel-ungueltig": "Das Formbeispiel des Auftrags ist kein gültiger Code",
  "Fehlerklassen-titel": "Fehlermeldungen je Fehlerklasse",
  "Fehler-laenge": "Der Code hat 5 Zeichen",
  "Fehler-zeichen": "Im Code kommt kein I, kein O",
  "Fehler-pruefziffer": "Die Prüfziffer passt nicht",
  "Fehler-sitzung": "Dieser Ergebnis-Code gehört zu Sitzung 7",
  "Fehler-art-feld": "Zusatzfeld `art`",
  "Fehler-unterscheiden": "unterscheiden können",
  "Fehler-beispiele": "Je Klasse ein gemessener Beleg",
  "Fehler-ergebnisfeld": "im Ergebnisfeld",
  "Kennwert-titel": "Der Netzkennwert (Spezifikationstext)",
  "Kennwert-funktion": "function netzkennwert(netz)",
  "Kennwert-messung": "gleiches Netz zweimal gebaut",
  "Kennwert-kein-pruefmittel": "kein** Prüfmittel gegen Manipulation",
  "Flow-falle": "Flow-Regler.**",
  "Flow-ohne": "muss `ohneFlow: true`",
  "Einstellungen-falle": "**Einstellungen.**",
  "Oeffnungsweg": "Der Öffnungsweg für die Oberfläche",
  "Oeffnungsweg-code": "const c = Spiel.klassenraum.ausCode(eingabe)",
  "Oeffnungsweg-oeffnen": "Spiel.oeffnen(inst.iid);",
  "Quelle-messung-titel": "warum, mit Messung",
  "Quelle-ohneFlow-zeile": "ohneFlow: true` verhindert den Flow-Umbau",
  "Quelle-regulaer": "zählt **nicht** als reguläres Postfach-Ticket",
  "Quelle-sichtbar": "Auftrag ist trotzdem im Postfach sichtbar",
  "Quelle-postfachziel": "Postfach-Ziel bleibt unberührt",
  "ErgebnisCode-titel": "**`ergebnisCode(inst, abnahme)`**",
  "ErgebnisCode-fehler": "Dieser Auftrag kam nicht über einen Klassenraum-Code",
  "ErgebnisCode-dauerS": "`dauerS = round(inst.zeitMs/1000)`",
  "ErgebnisCode-beispiel": "E-KFWS-HZM",
  "Eintragen-titel": "**`ergebnisEintragen(code)` – idempotent**",
  "Eintragen-doppelt": "derselbe Code noch einmal",
  "Eintragen-platz-schon-da": "anderer Code für denselben Platz",
  "Eintragen-erster-gewinnt": "Erster Eintrag gewinnt",
  "Eintragen-block": "Block-Eingabe (mehrere Codes",
  "Platzkennung": "**`platzkennung` (Leiter-Hinweis 4):**",
  "Platzkennung-klarname": "Ein Klarname ist nicht möglich",
  "Ergebnis-bit-platz": "| `platz` | 5 | 0..31",
  "Ergebnis-bit-sterne": "| `sterne` | 4 | 0..10",
  "Ergebnis-bit-versuche": "| `versuche` | 2 | 0..3",
  "Ergebnis-bit-dauer": "| `dauer` | 9 | 0..511",
  "Ergebnis-median-antwort": "für eine Ampel mit Median-Dauer",
  "Ergebnis-doppelt-fremd-titel": "### 6.2 Doppelter oder fremder Code",
  "Speicher-titel": "### 7.1 Speicherform",
  "Speicher-feldtabelle": "| Feld | Typ | Bedeutung |",
  "Speicher-ergebnisse-feld": "| `sitzung.ergebnisse` |",
  "Speicher-platz-feld": "**lokal gewählte** Platzkennung",
  "Speicher-feldliste": "Gemessene Feldliste von `erzeugen`",
  "Export-titel": "### 7.2 Export/Import",
  "Export-format": "\"format\": \"netzwerk-labor/klassenraum\"",
  "Export-ohne-sitzung": "nichts zu exportieren",
  "Export-verlustfrei": "verlustfrei = true",
  "Export-fassung": "**Fassungsprüfung:**",
  "Export-fehlerfelle": "| `\"\"` | `{fehler:\"format\", grund:\"Die Datei ist leer.\"}` |",
  "Export-fremd": "Das ist keine Klassenraum-Datei (format fehlt)",
  "Export-angennommen": "`{ok:true, sitzung}` (angenommen)",
  "API-tabelle-titel": "| Funktion | Signatur | Rückgabe bei Erfolg",
  "API-exportieren": "| `exportieren` | `()` | JSON-String",
  "API-sitzung": "| `sitzung` | `()` | Sitzung aus `store \"klassenraum\"`",
  "API-ergebnislesen": "| `ergebnisLesen` | `(code)`",
  "API-platz": "| `platz` / `platzSetzen` (Helfer)",
  "Kopf-nachrechnen": "## 0 · Nachrechnen",
  "Kopf-basisstand": "Basisstand dieser Sitzung",
};

const fehlt = [], mehrfach = [], gefunden = {};
for (const [name, stueck] of Object.entries(STUECKE)) {
  const treffer = [];
  zeilen.forEach((z, i) => { if (z.includes(stueck)) treffer.push(i + 1); });
  if (treffer.length === 1) gefunden[name] = treffer[0];
  else if (!treffer.length) fehlt.push(name + " [" + stueck.slice(0, 45) + "]");
  else mehrfach.push(name + " -> " + treffer.join(", "));
}
console.log(REL);
console.log("Zeilen: " + zeilen.length);
for (const [name, nr] of Object.entries(gefunden)) console.log("  " + name.padEnd(28) + " :" + nr);
if (mehrfach.length) { console.log("MEHRFACH:"); for (const s of mehrfach) console.log("  " + s); }
if (fehlt.length) { console.log("NICHT GEFUNDEN:"); for (const s of fehlt) console.log("  " + s); }
