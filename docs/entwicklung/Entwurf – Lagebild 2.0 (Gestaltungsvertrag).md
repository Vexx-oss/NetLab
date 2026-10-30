# Lagebild 2.0 — Gestaltungs- und Umsetzungsvertrag (Arbeitsstand, 30.10.2026)

> Zweck: verbindliche Zwischenfassung für die Sitzung „Lab-Fläche schön und richtig".
> Wird bei der Abnahme als Abschnitt in docs/Architektur.md übernommen (Projektregel „Vertrag zuerst").
> Gilt für alle Teammitglieder; wer abweichen will, fragt die Leitung.

## 0 · Auftrag des Nutzers (wörtlich)

> „nutze ein team um die Lab funktion zu optimieren. Es ist hässloch blockig und die daten
> werden fehlerhaft dargestellt. Überlege dir eine schöne alternative passend zu jedem Theme
> welche professionell und von profis designed aussieht"

Reichweite: Labor-Fläche (.lb-leinwand / .lb-svg) inkl. Knoten, Kanten, Zonen, Legende und
Minimap — in allen fünf Themes (Nordlicht, Messing, Papier, Pulsar, Keramik) und im
POLARIS-Standard. Nicht im Auftrag: Hub-Panel „Lagebild" (hb-lage), Interaktionslogik,
Inspektor, Dock, Simulation, Datenformate, Speicherung.

## 1 · Befunde (am 30.10.2026 gemessen, Belege in Nachweise/1.2-Topo/)

Belege: Nachweise/1.2-Topo/lagebild-vorher-salon.png und -praxis.png (1736x964, Edge headless
über python tools/topo-foto.py), Code in src/ui/editor.js (zeichnen / kabelGruppe /
geraetGruppe), src/ui/ebenen.js (adresse / zonen / zeichneZonen), src/stil/editor.css Zeile 34,
src/stil/zz-polaris.css Zeile 45-63, Theme-Bilder Nachweise/themes/galerie/*-labor.png.

| # | Befund | Beleg |
|---|---|---|
| B1 | Zonen-Beschriftung nie sichtbar: Regel .lb-s-zonen .zone-schild, .lb-s-zonen .zone-text {display:none} — die Subnetz-CIDR wird gezeichnet, aber immer ausgeblendet. In der Ebene „IP-Netze" sieht man farbige Flächen ohne Bedeutung. | editor.css:34 |
| B2 | Zonenform blockig: konvexe Hülle um Gerätemittelpunkte + Radius 54 → harte Vieleckkanten; bei mehreren Subnetzen überlappen die Hüllen zu einer großen unlesbaren Fläche (Praxis: 3 LAN + WAN). | ebenen.js:99-159, Bild praxis |
| B3 | Router in jeder Zone: alleAdressen liefert alle Interfaces; der Router steckt in drei LAN-Zonen und der WAN-Zone → Hüllen ziehen sich über die ganze Fläche. | ebenen.js:71-97 |
| B4 | Portname + Linkstatus unsichtbar: Statussymbole (.ps) und Portnamen (.kabel-port) werden 28-78 px von der Gerätemitte gezeichnet — die 168x112-Karte (Ebene geraete über kabel) liegt darüber. Sichtbar bleibt nur ein „Gekritzel" auf kurzen Strecken. | editor.js:414-497 |
| B5 | Kabel enden im Nichts: Pfad Gerätemitte→Gerätemitte, unter der Karte versteckt; Steckerplastik (.kabel-stecker) schwimmt im Freiraum. | editor.js:436-514, Bilder |
| B6 | Textüberlauf: „192.168.10.1/24 +2" läuft über die Kartenkante (kein Messen, kein Kürzen); „DHCP – noch keine Adresse" ist breiter als die Karte. | editor.js:530-566, Bilder |
| B7 | Leere zweite Zeile: Switch ohne IP zeigt unter dem Namen nichts; „PC1 / keine IP" wirkt kaputt (kursiv, blass) statt erklärt. | Bilder |
| B8 | Legende lügt: sie verspricht VERBUNDEN/GETRENNT/KEIN LINK, aber GETRENNT/KEIN LINK sind optisch nicht auffindbar (Statussymbole verdeckt, s. B4). | editor.js:103-106, Bilder |
| B9 | Karten sind blockig: 168x112-Rahmen mit viel Leerraum; Icon links oben, zwei Textzeilen — Wireframe, kein technisches Lagebild. | Bilder, zz-polaris.css:45-50 |
| B10 | Minimap ohne Aussage: „ÜBERSICHT" zeigt Punkte/Linien ohne Rahmen; Sichtrahmen unsichtbar, solange die Ansicht alles zeigt. | werkstatt.js:174-252, Bilder |

## 2 · Gestaltungsziel

Ein technisches Lagebild auf Netzplan-Niveau (Draw.io / Lucidchart / NetBox):

1. Knoten sind Beschriftungsträger, nicht Karten: Icon-Platte (Typfarbe), Name, Rolle, Adresse.
   Rahmen nur als Haarlinie, Auswahl als Akzentring, kein Leerraum-Kasten.
2. Kanten sind Verbindungen: Anfang und Ende an der Knotenkante (nicht im Zentrum), orthogonal
   mit 6-px-Rundungen, an beiden Enden ein Port-LED-Punkt; Portnamen nur bei Platz
   (Hover/Auswahl/Zoom >= 0,9).
3. Zonen sind Flächen mit Namen: weiche gerundete Inseln statt Vielecke, 1-px-Randlinie
   gestrichelt, CIDR immer sichtbar im Chip an der Insel. Router/Firewalls sind Anker, keine
   Zonenmitglieder. Reine Verbindungsnetze (/30) als schmale Kapsel auf der Strecke.
4. Zustand ruhig kodiert: Link oben durchgezogen, Link unten gestrichelt (Koralle), Port aus
   gepunktet; „ohne Link" am Knoten = gestrichelter Koralle-Rahmen, nicht „kaputt".
5. Schrift bleibt lesbar: Beschriftungen werden mit dem Zoom gegenskaliert (konstante
   Bildschirmgröße) statt ausgeblendet. Bei kleinem Zoom fällt zuerst die Rolle weg, dann die
   Adresse; Name und Zonen-CIDR bleiben immer.
6. Jedes Theme erzählt dasselbe Lagebild in seiner Materialsprache (§ 4); Geometrie und
   Informationshierarchie sind identisch.

## 3 · Technischer Vertrag (verbindlich für Code und CSS)

### 3.1 Knoten (src/ui/editor.js: geraetGruppe)

Weltmaße: breit (Fenster >= 900 px) KW=140, KH=76; schmal KW=110, KH=64; Mittelpunkt =
Geräteposition. Markup (Klassen stabil halten, Tests/Klassenprüfer kennen sie):

    <g class="ger typ-router [aus] [gewaehlt] [ohne-ip] [zielt]" data-id="r1" transform="translate(x y)">
      <rect class="ger-treffer"/>          Trefferfläche, unsichtbar, >= 44x44 px bei Einpasszoom
      <rect class="ger-auswahl"/>          Auswahlring (CSS blendet standardmäßig aus)
      <rect class="ger-karte"/>            Haarlinien-Rahmen, rx 12 (schmal 10)
      <g class="ger-bild">…</g>            UI.geraetebild, Platte 28x28 links, Glyph ~0.5
      <g class="ger-text">                 wird gegenskaliert (3.4)
        <text class="ger-name">R-SALON</text>
        <text class="ger-rolle">Router · 2 Netze</text>
        <text class="ger-ip">192.168.20.1/24 <tspan class="ger-mehr">+1</tspan></text>
      </g>
      <g class="badge …">…</g>             bestehende Badges (Warnung/aus/ungespeichert)
    </g>

Regeln:
* Texte linksbündig ab x = -KW/2 + 48; Zeilen: Name y=-6, Rolle y=11, Adresse y=28.
  Icon-Platte 28x28 bei x = -KW/2+10 bis -KW/2+38, vertikal mittig.
* .ger-rolle: kurze Rolle aus UI.geraeteArt(typ, skin).titel plus Zusatz, z. B. „Router · 2 Netze",
  „Switch · VLAN 10,20,30", „PC · DHCP", „Drucker · Dienst 9100", „Internet · Provider",
  „Switch · L2". Nie leer.
* .ger-ip: erste gültige Adresse; bei mehreren Adressen „+N" als eigener gedämpfter Zusatz
  (tspan.ger-mehr), gemessen und INNERHALB der Karte gekürzt, nie über den Rahmen. Ohne Adresse
  kein .ger-ip-Element; stattdessen Rolle „keine Adresse" / „DHCP – keine Adresse".
* „PC ohne IP" ist kein Fehlerbild: .ohne-ip bekommt gestrichelten Koralle-Rahmen und Rolle
  „kein Link" (ohne Kabel) bzw. „keine Adresse".
* ger-treffer deckt die ganze Karte (tools/rauch.py prüft elementFromPoint).

### 3.2 Kanten (kabelGruppe)

* Endpunkte: Schnittpunkt der Gerade Mitte A → Mitte B mit dem Kartenrechteck (Ray-Box).
  Dort Port-LED (circle.port-led, r=2,6) exakt auf der Rahmenlinie.
* Pfad orthogonal mit 6-px-Radius (M … H … V …), bei gerader Strecke gerade; Z.versatz
  (Mehrfachkabel) weiter berücksichtigen.
* .kabel-huelle (4 px, Flächenfarbe) bleibt als Trennstrich über Raster/Zonen.
* .kabel-linie: 1,5 px (non-scaling), Statusklassen k-oben / k-unten / k-aus bleiben;
  k-unten gestrichelt 5 4, k-aus gepunktet 1 5; trunk = zwei parallele Haarlinien im Abstand
  2,5 px statt dicker Doppellinie.
* Stecker entfallen: .kabel-stecker nicht mehr erzeugen, CSS-Regeln entfernen.
* Portnamen (.kabel-port): nur bei Zoom >= 0,9 UND ohne Überlappen mit Karte/Kollegen
  (einfache Kollisionsliste), 12 px außerhalb des Rahmens, Anker je nach Richtung; bei
  Auswahl/Hover des Geräts oder Kabels immer, sofern Platz.
* Kabel-Layer bleibt UNTER den Geräten; LED und Portname liegen in der Gruppe Z.s.ueber
  (über den Geräten), damit sie nie verdeckt werden.
* Tooltip-Text bleibt vollständig (Geräte, Ports, Linkstatus, Grund, Trunk).

### 3.3 Zonen (src/ui/ebenen.js: zonen / zeichneZonen)

* Mitglied einer Zone: Gerät mit genau EINER gültigen Adresse in diesem Netz. Geräte mit >= 2
  Adressen (Router/Firewall) sind Anker: nicht Teil der Form, aber im Zonen-Chip als
  „GW <ip>" geführt (erste passende Adresse).
* Zonen mit <= 2 Mitgliedern und mindestens einer Kante zwischen ihnen (z. B. WAN /30):
  Kapsel um die Strecke (Rechteck r=999, Breite 34) statt Hülle.
* Sonst weiche Insel: konvexe Hülle der Mittelpunkte, um 70 Welt-Einheiten aufgeblasen, als
  geschlossener Catmull-Rom→Bézier-Pfad (keine harten Ecken). Füllung var(--zone-x), Rand 1 px
  gestrichelt 6 5 in var(--zone-x-linie), non-scaling.
* Chip (.zone-label) am linken oberen Rand der Insel: rect (r 7, Füllung var(--panel), Rand
  var(--line)) + circle.zone-punkt (r 3, var(--zone-x-linie)) + text.zone-text
  „192.168.10.0/24" (mono, 11 px, var(--ink)); optionale zweite Zeile „GW 192.168.10.1"
  (tspan.zone-gw, 10,5 px, var(--muted)). Bei APIPA Zusatz „· APIPA".
* Chips kollidieren nicht mit Geräten/Karten/Chips (Kollisionsliste wie schildStelle, größere
  Schritte, Reihenfolge unten→rechts→links→oben).
* Chips werden NIE per CSS ausgeblendet (B1 beheben). Klassen zone, zone-flaeche, zone-label,
  zone-punkt, zone-text, zone-gw, zone-a … zone-e bleiben/kommen in CSS vor.

### 3.4 Zoom und Lesbarkeit (ansichtSetzen)

* k = Zoomfaktor (0,25 … 1,1 beim Einpassen). s = min(1,6; max(1; 1/k)).
* Je Knoten: g.ger-text bekommt transform translate(0 yOff) scale(s) translate(0 -yOff) mit
  yOff = -KH/2 + 12 (Skalierung um den Textanker, linke obere Ecke bleibt stehen).
  Zonen-Chips analog um ihren Ankerpunkt.
* JS setzt Klassen am svg: wenig-text (k < 0,9) blendet .ger-rolle und .kabel-port aus;
  klein (k < 0,6) zusätzlich .ger-ip und .ger-mehr; sehr-klein (k < 0,4) zusätzlich .ger-name
  (Icons bleiben). .zone-label wird in KEINER Klasse ausgeblendet.

### 3.5 Legende und Minimap

* .lb-legende: drei Einträge — durchgezogene 2-px-Linie + VERBUNDEN, gestrichelt 5 4 +
  GETRENNT, gepunktet 1 5 + KEIN LINK; mono 10 px, Sperrsatz, Flächen-Pille mit var(--glas);
  Farben exakt wie die Kanten.
* Minimap .wk-mini: Struktur/Klassen unverändert (Tests zählen .wk-mini-kabel-linie), nur Optik:
  Fläche var(--panel-2), Rand var(--line), Titel ÜBERSICHT in mono 10 px, Punkte r 2,2
  (gewählt 3,2), Sichtrahmen gestrichelt var(--accent) 1,25 px, Zoom-Pille wie .lb-zoomtext.
* Optional, wenn ohne Überlauf machbar: Zähler-Chip oben rechts auf der Fläche
  („6 Geräte · 5 verbunden · 1 ohne Link"), gleiche Optik wie Zonen-Chip, keine neue Interaktion.

### 3.6 Theme-Tokens (neu; Default in zz-polaris.css :root, je Theme überschrieben)

--lage-flaeche --lage-raster --lage-knoten-bg --lage-knoten-rand --lage-knoten-schatten
--lage-name --lage-rolle --lage-ip --lage-platte --lage-platte-rand --lage-kante
--lage-kante-huelle --lage-chip-bg --lage-chip-rand --lage-chip-text --lage-mini-bg
--lage-mini-rand --lage-radius --lage-glow

Basis-CSS nutzt IMMER Fallbacks: var(--lage-knoten-bg, var(--panel)) usw., damit ein Theme ohne
Token nicht bricht. Neue Regeln außerhalb der Token-Blöcke nur mit var(--…)-Farben, Radien und
Schriften (Themes-Vertrag, Ethos R1-R3).

## 4 · Materialsprache je Theme (Vorgabe; der Designer darf verfeinern)

| Theme | Fläche | Knoten | Kanten | Zonen | Schrift |
|---|---|---|---|---|---|
| POLARIS (Standard) | bg + Punktraster | Haarlinien-Rahmen, Platte Typfarbe 12 %, Auswahlring | 1,5 px, Mint/Koralle, ruhig | blasse Fläche + Chip | Mono, Sperrsatz |
| Nordlicht | Polarnacht-Schiefer, feines Raster | Eisplatte, 1-px-Kante, kaltes Oberlicht | feine Eishaarlinien, Aurora nur bei Aktion | Aurora-Schleier, Chip wie Koordinatenmarke | Mono, weiter Sperrsatz |
| Messing | Espresso-Graphit, warmes Raster | Messing-Plakette, Haarlinien-Doppelrahmen, Elfenbein-Name | Messing-Haarlinie, Patina bei Störung | Sepia-Wäsche, gestrichelter Kupferrand | Serif-Zahlen, Mono-Labels |
| Papier | warmes Papier, Punktraster | Tinten-Symbol, harter 2-px-Rahmen, Versatz-Schatten | Tintenstrich, Zinnober = Störung | Riso-Spot-Wäsche, Chip wie Notizzettel | Mono-Labels gegen Display |
| Pulsar | tiefes All, Sternenraster | Glasplatte mit Glow nur bei Auswahl | Neon-Mint/Cyan, leiser Glow | Neon-Kontur, Chip als HUD-Element | Mono, tabellarisch |
| Keramik | Kalkstein, weiches Raster | Steinplatte, große weiche Radien, matter Schatten | Salbei-Linie, Terrakotta = Störung | Mineral-Schleier, Chip wie Preisschild | humanistische Sans + Mono |

## 5 · Prüf-Gates (jede Abgabe)

1. python tools/klassen.py → 0 Klassen ohne CSS-Regel
2. python tools/ethos.py → GRUEN gegen tests/stil-stand.json
3. node tests/run.js ui- (betroffene Filter) → grün
4. Sichtprüfung: Screenshot 1440x900, Ebene „IP-Netze" mit Salon (zwei Zonen) und Praxis
   (drei Zonen), plus eine Störung (Gerät aus oder Port shutdown), immer per read_image selbst
   angesehen
5. Keine JS-Fehler im Browser (window.__nlFehler leer, Mechanik aus tools/starttest.py)

## 6 · Bericht (an die Leitung per send_message)

Kurz und mit Messzahlen: Dateien + was geändert; Befehle + Ergebnis; was selbst am Bild geprüft
wurde; was NICHT geprüft ist. Keine Behauptung ohne Messung.

## 7 · Fallen aus dem Testbestand (am 30.10.2026 gelesen, verbindlich)

1. **tests/ui-typografie.test.js liest die SVG-Textregeln aus src/stil/editor.css** — nicht aus
   zz-lagebild.css. Die Regeln .pd-name, .lb-wz-taste, .lb-geraete-titel, .badge-aus text,
   .vlan-schild text, .karte-zeile, .gw-schild text, .band-text, .paket-text, .ger-name, .ger-ip,
   .kabel-port müssen dort stehen bleiben und eine Typo-Stufe var(--fs-1..6) nutzen (kein px).
   Neue SVG-Textklassen (.ger-rolle, .ger-mehr, .zone-text, .zone-gw, .port-led) ebenfalls dort
   anlegen, mit var(--fs-…). Außerhalb basis.css ist font-size/font in px verboten.
2. **tests/ui-editor-flaeche.test.js fährt den echten editor.js gegen einen DOM-Ersatz.** Der Ersatz
   kennt KEIN getBBox(), KEIN getComputedTextLength(), KEIN getTotalLength(), KEIN getCTM() und
   KEIN innerHTML an SVG-Knoten. Textbreiten deterministisch schätzen (Zeichenzahl × Mono-Breite),
   Messungen an echten SVG-Knoten nur hinter typeof-Prüfung (z. B. if (el.getBBox)).
   Der Test greift auf UI.labor._ (Zustand), UI.labor._f (Helfer), UI.labor._.s.geraete,
   UI.labor._.el.hinweis, UI.labor._.netz zu — diese Zugänge nicht umbenennen. data-id bleibt am
   Geräte-<g>. Zeichnen darf nicht werfen, wenn UI.ebenen.zonen ersetzt wird (die Ausnahme muss
   weiterhin gefangen und als Hinweis auf der Fläche gezeigt werden, Zeile 272-279 des Tests).
3. **tests/ui-werkstatt.test.js**: Minimap behält .wk-mini-punkt (Anzahl = Geräte),
   .wk-mini-kabel-linie (Anzahl = Kabel), .wk-mini-svg, .wk-mini-rahmen; Klick zentriert.
   minimapDaten bleibt reine Datenquelle (kein DOM).
4. **tools/rauch.py**: elementFromPoint in der Mitte jedes sichtbaren Geräts muss das Gerät selbst
   treffen (ger-treffer deckt die Kartenmitte), keine leeren sichtbaren Flächen ab 24x12 px,
   kein waagerechter Überlauf.
5. **tools/klassen.py**: jede in src/ui/*.js als class:-Wert oder classList-Eintrag verwendete
   Klasse (mit Bindestrich) braucht eine CSS-Regel in src/stil/*.css. Neue Klassen also immer
   beidseitig anlegen (JS + CSS), sonst rot.
6. **tools/ethos.py**: Farben/Radien/Schriftgrößen nur über Tokens; Schrift nur aus
   {11, 12.5, 13, 14, 15, 16, 20, 28, 34, 44} px bzw. var(--fs-1..6); Abstand {0,4,8,12,16,24,32};
   Radius nur var(--radius-xs/-s/–), 999px, 50%; Schatten nur var(--schatten); Dauer 1/160/320ms;
   z-index nur 10..80. Werkzeug: python tools/ethos.py (GRÜN gegen tests/stil-stand.json).
7. **Kein Build durch Teammitglieder** (bauen.py schreibt web/index.html und docs/doku). Die
   Leitung baut, macht die Bilder und schickt Befunde zurück.
