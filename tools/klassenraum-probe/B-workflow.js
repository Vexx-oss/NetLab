const ROOT = "C:\\Users\\Student\\Documents\\Joshua\\10-Projekte\\Lernprojekte\\Netzwerk-Labor";
const NACH = ROOT + "\\Nachweise\\Klassenraum";

const REGELN = [
  "HARTE REGELN (Projekt Netzwerk-Labor, Zweig ausbau-1.2 - nichts committen, nichts pushen, kein Zweigwechsel):",
  "- Du bist BLOSSER LESER des echten Codes. Du darfst AUSSCHLIESSLICH deine eine Ausgabedatei schreiben. KEINE Aenderung an src/**, tests/**, tools/**, bauen.py, docs/**. Insbesondere NICHT python tools/repo-verweise-flicken.py ausfuehren (es schreibt).",
  "- Werkzeuge: Node portabel unter %LOCALAPPDATA%\\node-portable\\node-v24.21.0-win-x64\\node.exe; Python als python (3.14.6). sh tools/test.sh scheitert in dieser Sandbox - nutze stattdessen: <node> tests\\run.js . python tools/klassen.py und python tools/ethos.py funktionieren (beide lesen nur). python tools/rauch.py startet Edge headless - nur starten, wenn du es wirklich brauchst, und NIE Prozesse beenden.",
  "- Neue Dateien: UTF-8 ohne BOM, Zeilenenden LF, Deutsch, Anrede du, ehrlich: NICHTS behaupten, was nicht in dieser Sitzung am echten Code geprueft wurde. Nicht geprueft muss genau so dastehen.",
  "- JEDE Behauptung ueber den Code braucht eine Belegstelle in der Form Datei:Zeile (z. B. src/ui/app.js:57). Zeilennummern liest du mit dem read-Werkzeug; dessen Nummern sind die Wahrheit. Mindestens 25 Belegstellen in deinem Entwurf, davon mindestens 8 woertliche Zitate.",
  "- ERFUNDENE Namen, Signaturen, Zeilennummern oder APIs sind ein Totalschaden. Wenn du etwas nicht findest: schreibe nicht gefunden statt zu raten.",
  "- Antworte und schreibe auf Deutsch.",
].join("\n");

const AUSGABE = [
  "",
  "AUSGABEFORMAT deiner Datei (Markdown):",
  "# B-<thema> - Entwurf (Iteration 1)",
  "Kurzer Kopf: was drin steht, was du gelesen hast (Dateiliste), wann.",
  "Dann deine Abschnitte: fuer jeden Abschnitt erst die Festlegung, dann die Belege als Datei:Zeile.",
  "Am Ende die Abschnitte Nicht geprueft und Offene Fragen an den Leiter.",
  "",
  "Gib am Schluss als Ergebnis das JSON laut Schema zurueck: datei, thema, belege (Anzahl), festlegungen (Liste), offeneFragen (Liste), unsicher (Liste der Stellen, bei denen du dir NICHT sicher bist).",
  "",
].join("\n");

const P1 = [
  "Du bist Entwurfsautor A im Projekt Netzwerk-Labor. Thema: Registrierung der Klassenraum-Ansicht, DOM-Struktur, Klassennamen, CSS-Regeln, Tokens.",
  "",
  "Repo: " + ROOT,
  "Lies ZUERST vollstaendig: tools/auftraege/KLASSENRAUM.md (der Auftrag), tools/auftraege/COMMON.md, AGENTS.md.",
  "Dann den echten Code: src/ui/app.js (Kopfdoku 1-12, REIHE/PLATZ 20-31, Ansichten/Dock 56-120, Status 155-190, Aufbau/Abbau 191-238, Dialoge/Einstellungen 240-348), src/ui/dom.js (h/$/$$/sv, UI.kopieren), src/ui/geraetebilder.js ab Zeile 65 (UI.symbol mit der echten Symbol-Liste), src/stil/basis.css (vollstaendig), src/stil/hub.css und src/stil/rahmen.css (Haus-Muster: wie eine Ansicht aussieht), tools/klassen.py (Klassen gegen CSS-Regel), tools/ethos.py (Regelwerk R1 Farbe nur per Token, R2 Radius, R3 Schrift, R4 Abstand, R5 Dauer, R7 kein !important ausserhalb basis.css, R9 ein Selektor einmal, R10 keine identische Blockdopplung, R11 Einheit).",
  "Geplante neue Dateien des Auftrags: src/spiel/klassenraum.js, src/ui/klassenraum.js, src/stil/klassenraum.css, tests/klassenraum.test.js.",
  "",
  "DEIN ENTWURF MUSS ENTHALTEN:",
  "1. Registrierung: exakte Signatur von UI.app.registrieren aus dem Code (Felder titel/symbol/zeigen/wieder/verlassen/zaehler), wo die Ansicht in REIHE bzw. der Dock-Reihenfolge landet und WARUM dort (app.js:21 REIHE, app.js:79-82 liste()), dass sie ueber (UI.startHaken ||= []).push(...) beim Laden angemeldet wird (Muster: src/ui/hub.js:170-173, src/ui/spiel.js:843, src/ui/karriere.js:475-479), und der Symbolname als Beleg aus der echten Liste in src/ui/geraetebilder.js:67-116. Entscheide und BEGRUENDE: zwei getrennte Ansichten (Lehrer + Schueler) ODER eine Ansicht mit Umschalter. Wenn zwei: welcher Name, welches Symbol, welche Dock-Position fuer welche, und wie viele Dock-Knoepfe dadurch entstehen (Dock-Ueberlauf pruefen: .dock hat overflow-y auto, rahmen.css:40).",
  "2. DOM-Baum je Ansicht: aus echten h(...)-Aufrufen, so wie der Haus-Stil es macht (Muster src/ui/hub.js:24-67). Alle Klassennamen NEU und eindeutig - schlage ein Praefix vor (Haus-Praefixe: lb-, sp-, hb-, kr-, dx-, am-) und zwar eines, das klassen.py akzeptiert (Regex: kleinbuchstabig, mit Bindestrich). WICHTIG: klassen.py sammelt Woerter aus Zeilen mit class:/classList/className/closest/querySelector/$( in src/ui/*.js und verlangt zu JEDEM eine CSS-Regel in src/stil/*.css.",
  "3. Tabelle Klasse zu CSS-Regel: jede verwendete Klasse mit der Regel in src/stil/klassenraum.css, die sie abdeckt. Zaehle am Ende: Zahl der Klassen = Zahl der CSS-Regeln, die sie abdecken. Keine Regel ohne Klasse, keine Klasse ohne Regel.",
  "4. Tokens: Liste NUR der Tokens aus src/stil/basis.css, die du verwendest - jeder mit Variablennamen UND Zeilennummer (z. B. --panel = basis.css:8). Kein neues Farb- oder Groessensystem, keine Farb-Literale (R1), kein !important (R7).",
  "5. ethos-Falle: pruefe und belege, wie R3 (Schrift nur 11,12,13,15,20,28 px, kein em/%/rem), R4 (Abstand nur 0,4,8,12,16,24,32 px) und R10 (keine zwei identischen Regelbloecke) deine CSS-Regeln einschraenken. Wenn du fuer die Beamer-Schrift (grosser Auftragscode, aus drei Metern lesbar) eine Groesse ausserhalb der Skala brauchst: sage genau, welche Schreibweise durch die Pruefung rutscht und WARUM (lies tools/ethos.py:177-197 genau) - und dass das den Sinn der Regel umgeht (ehrlich benennen).",
  "6. Leer- und Fehlerzustaende: was zeigt die Ansicht, wenn es keine Sitzung gibt bzw. der Store leer ist.",
  "7. Ohne Karriere-Spielstand: pruefe an src/spiel/zustand.js:82-91 (Getter Spiel.st ruft Spiel.laden()), zustand.js:136-152 (Spiel.laden fuellt das Postfach), src/ui/hub.js:26 (if (!Spiel._st) { c.replaceChildren(); return; }) - funktioniert deine Ansicht auf einem frischen Schulrechner? Was ist zu tun, damit sie es tut (z. B. Spiel.laden() vorher aufrufen)?",
  "",
  REGELN,
  AUSGABE,
  "Deine Ausgabedatei: " + NACH + "\\B-ansichten.md",
].join("\n");

const P2 = [
  "Du bist Entwurfsautor B im Projekt Netzwerk-Labor. Thema: alle deutschen Texte im Wortlaut, Ablauf Klassenraum-Auftrag, Startseiten-Eingabezeile, Rauchtest-Beleg, Beamer-Lesbarkeit.",
  "",
  "Repo: " + ROOT,
  "Lies ZUERST vollstaendig: tools/auftraege/KLASSENRAUM.md, tools/auftraege/COMMON.md, AGENTS.md.",
  "Dann den echten Code: src/ui/hub.js (Startseite Heute, 24-83 und 170-174), src/ui/start.js (UI.starten 44-107), src/ui/spiel.js (oeffnen 40-71, abnahmeAnfordern 380-411, ergebnisZeigen 444-526, Registrierung 843), src/spiel/postfach.js (instanzErstellen 61-105, postfachZiel 14, postfachAuffuellen 145-189, postfach-Filter 120-132), src/spiel/abnahme.js (abnahme 13-45, abschliessen 86-150), src/spiel/ticket.js (oeffnen 41-59), src/ui/toast.js, tools/rauch.py (vollstaendig: HELFER 53-172, FAELLE 175-187, erster_auftrag 273-333, fall_pruefen 336-373), src/stil/hub.css.",
  "",
  "DEIN ENTWURF MUSS ENTHALTEN:",
  "1. Textliste woertlich (Deutsch, Anrede du) als Tabelle Text / wo er erscheint / Zweck: Begruessung und Titel beider Klassenraum-Ansichten, Feldbeschriftungen (Auftragscode, Ergebnis-Code, Platzkennung), Knopfbeschriftungen, Platzhalter, die Tippfehler-Meldung aus dem Auftrag WOERTLICH (Pruefziffer stimmt nicht - hast du ein O statt 0 getippt?), Fehlermeldungen (leeres Feld, unbekannter Code, Code einer fremden oder aelteren Sitzung), leerer Zustand beider Ansichten, Erfolgsmeldungen (Code angenommen, Kopier-Rueckmeldung), der Firewall-Hinweis fuer den Server woertlich, Hinweis auf fehlenden Server (keine Fehlermeldung!) und alle Texte der Ampel und der Ergebnistabelle.",
  "2. Ablauf Klassenraum-Auftrag als exakte Aufrufkette mit Datei:Zeile: Code eingeben -> Spiel.klassenraum.ausCode -> Spiel.instanzErstellen({ticketId, seed, quelle:klassenraum, ohneFlow:true}) -> Spiel.oeffnen(iid) -> UI.spiel.oeffnen(iid) (src/ui/spiel.js:40-71) -> UI.labor.laden + UI.app.ansicht(labor). Belege, was die Felder bewirken: postfach.js:79 (flow/ohneFlow), :81 (seed), :86-89 (def.fuerSeed -> vielfalt, identisches Netz je id+seed), :92-97 (Instanzfelder quelle), :98 (st.postfach.push), :101-103 (speichern und melden), :124 (Spiel.postfach-Filter pruefung/raetsel), :152 (regulaer() zaehlt nur postfach/generiert), :14 postfachZiel. Beantworte ausdruecklich: Was passiert, wenn quelle klassenraum NICHT gefiltert wird (Karriere, Lohn, st.erledigt: abnahme.js:117, :133, :146; instanzEntfernen postfach.js:215-220)? Was darf NICHT passieren und welche Zeile verhindert es? Titel Klassenraum-Auftrag: wo genau setzt man ihn (def.titel kommt aus DATEN.tickets - geht das ohne fremde Datei zu aendern? Belege, wie die Auftragszeile den Titel zieht: src/ui/spiel.js:104-120).",
  "3. Startseite: genaue Position der Code-Eingabezeile (Datei, Funktion, Element, Zeile), Beschriftung, Verhalten (Enter, Gross-/Kleinschreibung egal, Trennstriche optional, NL-4F7K-2Q UND nl4f7k2q muessen beide gehen) und KEIN zweiter Hauptknopf. Belege den Platz: src/ui/hub.js:63-67 (hb-seite, hb-ziel), src/stil/hub.css:2-3 (Breitenmuster), hub.css:41 (hb-annehmen).",
  "4. Rauchtest-Beleg: Liste mit ZEILENNUMMERN aus tools/rauch.py, welche Selektoren und Klickfolgen die Startseite (Heute) bzw. den ersten Auftrag beruehren: FAELLE Zeile 176 (.hb-annehmen, .hb .primaer), Zeile 184 (input[type=search]), erster_auftrag 276-333, HELFER basis/ansicht/ticket 57-70, haupt() 85-100, ueberlauf() 105-132, geraeteFrei() 135-147, leer() 151-170, ABSICHT 103. Sage fuer JEDEN Treffer, ob die neue Zeile ihn beruehrt (ja/nein mit Begruendung) und was konkret verboten ist, damit 36/36 gruen bleibt (z. B. keine Klasse primaer, kein input[type=search]). Rechne die Fallzahl nach: 3 Breiten mal (1 + 11) = 36 und belege die Schleifen (Zeilen 411-432).",
  "5. Beamer-Lesbarkeit: Rechnung mit Sehwinkel (Bogenminuten) und Zeichenhoehe in mm: Abstand 3 m, Versalhoehe der Monospace-Schrift, Zielwert begruenden (z. B. 20-25 Bogenminuten). Dann konkrete font-size-Werte fuer Fensterbreiten 1366/960/720 px, inklusive verfuegbarer Innenbreite (Dock --dock-b basis.css:42, Kopfzeile --kopf-h) und der Zeichenzahl des Codes (Format NL-4F7K-2Q: wie viele Zeichen inklusive Trennstriche? Zeichenbreite 0,6em bei Monospace annehmen und begruenden). Gib eine clamp()-Formel an (Beispiel im Haus: src/stil/konsole.css:61) und die sich daraus ergebende Zeichenhoehe in mm. Beachte: tools/ethos.py:177-197 prueft font-size nur, wenn der Wert mit Zahl plus px/em/rem/% BEGINNT - pruefe das selbst und sage, was daraus fuer die Schreibweise folgt.",
  "",
  REGELN,
  AUSGABE,
  "Deine Ausgabedatei: " + NACH + "\\B-texte-ablauf.md",
].join("\n");

const P3 = [
  "Du bist Entwurfsautor C im Projekt Netzwerk-Labor. Thema: Ampel, Lehrer-Eingabe mehrerer Codes, Export und Import als Datei, Einstellungs-Schalter, Kopieren.",
  "",
  "Repo: " + ROOT,
  "Lies ZUERST vollstaendig: tools/auftraege/KLASSENRAUM.md (der Auftrag), tools/auftraege/COMMON.md, AGENTS.md.",
  "Dann den echten Code: src/plattform/plattform.js (37 Zeilen), src/plattform/plattform-browser.js (datei.exportieren/importieren 44-59), src/plattform/plattform-tauri.js (datei 72-75, kann() 76-80), src/ui/app.js (einstellungen 339-348, einstellungAbschnitt 267-270, zeile 281-286, schalter 287-291, dialogOeffnen 241-260, wahl 271-280, einstSetzen 38), src/ui/hub.js (kopieren 122-126, einstellungAbschnitt 170-173), src/ui/dom.js (UI.kopieren 36-43, UI.buehneFrei 34), src/ui/toast.js (UI.toast-Signatur), src/spiel/zustand.js (Store-Schluessel labor 157, einst 184, Getter 82-91, Spiel.einstSetzen 178-187, Spiel.importPruefen 126-134), src/spiel/abnahme.js (sterneBerechnen 49-62, abschliessen 86-150), src/spiel/postfach.js (instanzErstellen 61-105), src/kern/basis.js (store.get/store.set, heute, datumDe).",
  "",
  "DEIN ENTWURF MUSS ENTHALTEN:",
  "1. Ampel: exakte Definition. Was zaehlt als fertig (eingetragener Ergebnis-Code), was als offen (die Sitzung kennt die Plaetze - woher? Vorschlag an Bereich A, welche Felder die Sitzung dafuer braucht), wie wird die Median-Dauer gerechnet: gerade Anzahl (Mittel der beiden mittleren oder oberer Wert) - entscheide EINE Regel und begruende sie, fehlende Dauern (nur gueltige zaehlen), Rundung (auf Sekunden oder Minuten, kaufmaennisch oder abgeschnitten) und was die Ampel bei 0 Codes farblich zeigt (Tokens --ok/--warn/--bad/--muted aus basis.css mit Zeilennummer). Belege die Farb-Tokens (src/stil/basis.css:19-22) und nenne die genauen Schwellen in Zahlen. Denke an Doppelte (derselbe Code zweimal = 1 fertig).",
  "2. Lehrer-Eingabe mehrerer Codes: ein Textfeld (textarea) fuer einen Block ODER ein Feld mit Enter je Code - entscheide EINES (oder beides) und begruende es; Zerlegung des Blocks (Zeilenumbrueche, Kommas, Leerzeichen, Semikolon), Normalisierung (Gross-/Kleinschreibung, Trennstriche, Leerzeichen), Erkennung von Doppelten, Fehlerrueckmeldung JE ZEILE (Liste mit Zeilennummer und Grund), Verhalten bei teilweisem Erfolg (gueltige eintragen, ungueltige melden). Belege, wie das Spiel Text zerlegt (Muster in src/ui/editor.js oder src/ui/konsole.js - suche nach split).",
  "3. Export und Import als Datei: die ECHTEN APIs - Plattform.datei.exportieren(name, text) und Plattform.datei.importieren() (plattform.js:28-31), Browser-Fassung (Blob und a.download, plattform-browser.js:45-51; FileReader-Rueckfall 52-58) und Desktop-Fassung (invoke exportieren/importieren, plattform-tauri.js:73-74). Dateiname-Vorschlag (mit Datum? Belege, wie das Projekt Datum formatiert: datumDe, plusTage, heute aus src/kern/basis.js), Fehlerfaelle (kein Dialog verfuegbar, abgebrochen mit Rueckgabe null, unlesbare Datei, fremdes JSON, zu neues Format - Muster Spiel.importPruefen src/spiel/zustand.js:126-134), Rueckmeldung an den Nutzer. Pruefe, ob Plattform.kann(datei) existiert oder ob die Faehigkeit anders geprueft werden muss (plattform-browser.js:8-15 NEIN-Liste, plattform.js:32 kann). Nenne den Store-Schluessel: store klassenraum (Auftrag Zeile 40) - belege, wie andere Schluessel gesetzt werden (store.set, src/spiel/start.js:38, src/spiel/zustand.js:157 und :184) und dass Spiel.st NICHT benutzt wird.",
  "4. Einstellungen: Schalter Klassenraum-Server (Standard AUS) ueber UI.app.einstellungAbschnitt(titel, fn) und die Haus-Bausteine zeile() und schalter() - belege die echten Signaturen (app.js:267-270, 281-291) und das Muster (app.js:330-335 Autostart, app.js:311-312 Ereignisse). Pruefe, wie andere Schalter ihren Wert schreiben (app.js:38 einstSetzen) und was fuer einen neuen Schluessel noetig ist. Der Firewall-Hinweis fuer den Server WOERTLICH (Auftrag Zeile 46: ehrlicher Hinweis auf die Windows-Firewall-Abfrage beim ersten Start) - formuliere ihn als fertigen Text und nenne die Stelle, wo er steht, und wie app.js die Plattform abfragt (app.js:321, 326, 330, 332-335).",
  "5. Kopieren: UI.kopieren (dom.js:36-43) und die Rueckmeldung per UI.toast (Muster hub.js:122-126). Beide Faelle: den grossen Code kopieren (Lehrer) und den Ergebnis-Code kopieren (Schueler). Was passiert, wenn das Kopieren scheitert (Rueckfall execCommand)? Nenne den echten Toast-Text.",
  "",
  REGELN,
  AUSGABE,
  "Deine Ausgabedatei: " + NACH + "\\B-ampel-eingabe.md",
].join("\n");

const SCHEMA_ENTWURF = {
  type: "object",
  additionalProperties: false,
  required: ["datei", "thema", "belege", "festlegungen", "offeneFragen", "unsicher"],
  properties: {
    datei: {type: "string"},
    thema: {type: "string"},
    belege: {type: "number"},
    festlegungen: {type: "array", items: {type: "string"}},
    offeneFragen: {type: "array", items: {type: "string"}},
    unsicher: {type: "array", items: {type: "string"}},
  },
};

phase("Entwürfe");
log("Drei Entwuerfe laufen parallel: Ansichten/DOM/CSS, Texte/Ablauf/Startseite, Ampel/Eingabe/Export.");
const [a1, a2, a3] = await parallel([
  () => agent(P1, {label: "Entwurf A: Ansichten/DOM/CSS", phase: "Entwürfe", schema: SCHEMA_ENTWURF}),
  () => agent(P2, {label: "Entwurf B: Texte/Ablauf/Startseite", phase: "Entwürfe", schema: SCHEMA_ENTWURF}),
  () => agent(P3, {label: "Entwurf C: Ampel/Eingabe/Export", phase: "Entwürfe", schema: SCHEMA_ENTWURF}),
]);
log("Entwuerfe fertig: " + [a1, a2, a3].filter(Boolean).length + " von 3.");

function prueferPrompt(thema, zusatz) {
  return [
    "Du bist Gegenpruefer im Projekt Netzwerk-Labor (Zweig ausbau-1.2). Aufgabe: pruefe die vorliegenden Entwuerfe ZEILE FUER ZEILE gegen den ECHTEN Code und liefere belegte Korrekturen. Du schreibst die Entwuerfe NICHT um, du korrigierst sie.",
    "",
    "Repo: " + ROOT,
    "Lies zuerst tools/auftraege/KLASSENRAUM.md (der Auftrag) und AGENTS.md, dann die drei Entwurfsdateien:",
    "- " + NACH + "\\B-ansichten.md",
    "- " + NACH + "\\B-texte-ablauf.md",
    "- " + NACH + "\\B-ampel-eingabe.md",
    "",
    "THEMA DIESER GEGENPRUEFUNG: " + thema,
    "",
    "VORGEHEN (keine Abkuerzungen):",
    "1. Lies jeden Entwurf vollstaendig.",
    "2. Pruefe JEDE Behauptung ueber den Code am echten Code nach: Namen, Signaturen, Felder, Zeilennummern, Selektoren, Token-Zeilen. Nenne jede falsche oder fehlende Belegstelle als FALSCH: <Behauptung> - richtig ist <Datei:Zeile>.",
    "3. Rechne alle Zahlen nach (Klassenzahl, Fallzahl des Rauchtests, Lesbarkeitsrechnung, Mediane).",
    "4. Pruefe die vier Leiter-Punkte ausdruecklich: (a) ohneFlow beim InstanzErstellen, (b) Klassenraum-Ansicht ohne Karriere-Spielstand, (c) Klassenraum-Abdruck aus dem tatsaechlich geladenen Netz (nicht aus dem Code) und wo er in beiden Ansichten steht, (d) die Rauchtest-Selektoren der Startseite mit Zeilennummern und ob die neue Eingabezeile sie trifft.",
    "5. Pruefe die CSS-Regeln gegen tools/ethos.py: R1 (keine Farb-Literale), R3 (font-size), R4 (Abstaende), R7 (kein !important), R9 (ein Selektor einmal), R10 (keine identische Blockdopplung), R11 (Einheit) - und die Schreibweise-Falle bei font-size (ethos.py:177-197 selbst lesen und den Regex nachvollziehen).",
    "6. Pruefe die Belegstelle-Pflicht: jede Zeile im Entwurf, die wie eine Behauptung aussieht, braucht Datei:Zeile.",
    "",
    zusatz,
    "",
    REGELN,
    "Inhalt deiner Ausgabedatei:",
    "# B-Gegenpruefung - <Thema>",
    "## Befunde (Tabelle: Entwurf | Behauptung | Befund FALSCH/BELEGT/UNBELEGT | richtige Belegstelle)",
    "## Korrekturen (konkrete Ersatztexte und Zeilen)",
    "## Was ich selbst nachgerechnet habe (mit Befehl und Ergebnis)",
    "## Nicht geprueft",
    "Gib als Ergebnis das JSON laut Schema zurueck: datei, falsch (Liste), korrekturen (Liste), zahlen (Liste), ungeprueft (Liste).",
  ].join("\n");
}

const SCHEMA_PRUEF = {
  type: "object",
  additionalProperties: false,
  required: ["datei", "falsch", "korrekturen", "zahlen", "ungeprueft"],
  properties: {
    datei: {type: "string"},
    falsch: {type: "array", items: {type: "string"}},
    korrekturen: {type: "array", items: {type: "string"}},
    zahlen: {type: "array", items: {type: "string"}},
    ungeprueft: {type: "array", items: {type: "string"}},
  },
};

phase("Gegenprüfung");
log("Drei Gegenpruefer laufen parallel.");
const [g1, g2, g3] = await parallel([
  () => agent(prueferPrompt(
    "Registrierung, DOM-Baum, Klassennamen, CSS-Regeln, Tokens, ethos-Zahlen",
    "Zusatz: Zaehle selbst nach, wie viele Klassen die Entwuerfe verwenden und wie viele CSS-Regeln sie dafuer nennen. Pruefe mit python tools/klassen.py, dass der Ist-Stand 0 ist. Pruefe jede genannte basis.css-Token-Zeile einzeln nach."
  ), {label: "Pruefer 1: Namen/DOM/CSS", phase: "Gegenprüfung", schema: SCHEMA_PRUEF}),
  () => agent(prueferPrompt(
    "Texte, Ablauf, Startseite, Rauchtest, Lesbarkeit",
    "Zusatz: Pruefe die Rauchtest-Analyse, indem du tools/rauch.py selbst liest und die Zeilennummern nachschlaegst. Rechne die Fallzahl nach. Pruefe die Lesbarkeitsrechnung selbst (Bogenminuten, Zeichenhoehe in mm, Zeichenzahl des Codes) und nenne Rechenfehler. Pruefe woertlich, dass die Tippfehler-Meldung des Auftrags (KLASSENRAUM.md:43) unveraendert uebernommen wurde."
  ), {label: "Pruefer 2: Texte/Ablauf/Rauchtest", phase: "Gegenprüfung", schema: SCHEMA_PRUEF}),
  () => agent(prueferPrompt(
    "Ampel, Eingabe, Export und Import, Einstellungen, Store, Plattform-APIs",
    "Zusatz: Pruefe jede Plattform-API gegen src/plattform/plattform.js, plattform-browser.js und plattform-tauri.js (Name, Argumente, Rueckgabe, Fehlerfall). Pruefe die Store-Schluessel gegen src/spiel/zustand.js und src/kern/basis.js (store.get/store.set-Signatur). Pruefe, ob ein Schalter in den Einstellungen wirklich ueber UI.app.einstellungAbschnitt geht und wo der Wert landet."
  ), {label: "Pruefer 3: Ampel/Export/Einstellungen", phase: "Gegenprüfung", schema: SCHEMA_PRUEF}),
]);
log("Gegenpruefungen fertig: " + [g1, g2, g3].filter(Boolean).length + " von 3.");

return {
  entwuerfe: {ansichten: a1, texte: a2, ampel: a3},
  pruefungen: {p1: g1, p2: g2, p3: g3},
};
