# 🪜 Hilfestellung – Stufen und Schnittstellen (verbindlicher Vertrag)

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Vertrag: [[Architektur]] · Spezifikation: [[Konzept – Netzwerk-Labor]]

> **Zweck.** Das Labor soll einen Menschen *ohne* Syntaxkenntnis spielbar machen, ohne ihn zu langweilen,
> sobald er die Syntax kennt. Dafür bekommt jede Ausbildungslage eine eigene **Hilfe-Stufe** mit einer
> messbaren Zahl von Hilfen. Dieser Text ist der Vertrag zwischen den Bausteinen — **zuerst hier eintragen,
> dann bauen** (AGENTS.md „Vertrag zuerst").
>
> **Grundsatz (aus dem Auftrag, 07.10.2026):** Ein Azubi *kann* die ganzen Syntaxe nicht kennen, und im
> Spielflow hat er keinen Zugriff auf eine Lernnotiz. Also muss das Spiel die Hilfe dort anbieten, wo er
> steht: im Terminal, in der Leiste, im Trainingsbereich. Die Hilfe ist **schrittweise** — sie wächst mit
> dem Bildungsstand und mit dem Lernstand der einzelnen Fertigkeit.

---

## § 1 · Begriff: Bildungsstand ≠ Erklärtiefe ≠ Niveau

Drei Dinge hießen bisher „Niveau". Ab hier sind sie getrennt — daran hängt jeder weitere Baustein.

| Begriff | Feld | Werte | Wer liest das? |
|---|---|---|---|
| **Bildungsstand** (neu) | `Spiel.einst.stufe` | `"azubi"` · `"azubi-plus"` · `"geselle"` · `"meister"` | `Spiel.stufe.*`, Terminal, Leiste, Trainingsbereich, Konsole, Simulation |
| **Erklärtiefe** (bestehend) | `Spiel.einst.niveau` | `"E"` · `"AP1"` · `"AP2"` | `UI.konsole` (heute), `Spiel.grundText` |
| **Prüfungsstrenge je Ticket** (bestehend) | `Spiel.einst.wahl`, `inst.niveau` | `"auto"` · `"E"` · `"AP1"` · `"AP2"` | `Spiel.niveauVon`, `Spiel.abnahme` |

**Regel:** Der Bildungsstand ist eine **Voreinstellung des Menschen**, kein Spielzustand und keine Automatik.
Er wird nie automatisch geändert. `Spiel.einst.niveau` (Erklärtiefe) wird beim Setzen des Bildungsstands
**mitgezogen**, bleibt aber einzeln verstellbar — wer AP2-Texte bei Azubi-Hilfe will, darf das.

## § 2 · Die vier Stufen (Zahlen sind Vertrag)

`stufe` ist der **Rang**: `azubi` 1 · `azubi-plus` 2 · `geselle` 3 · `meister` 4. Vergleiche immer über
den Rang, nie über den Namen.

| | `azubi` (1) | `azubi-plus` (2) | `geselle` (3) | `meister` (4) |
|---|---|---|---|---|
| **Wer** | 1. Lehrjahr, kennt keine Syntax | 2.–3. Lehrjahr, kennt Grundbefehle | kann den Job, übt Prüfung | will keine Hilfe |
| Terminal: Vorschlagsstreifen | **1 Vorschlag**, mit Syntax + Erklärung | bis **2** Vorschläge, knapp | nur nach Fehler | keiner |
| Terminal: „Was geht hier?" | **immer** sichtbar | sichtbar | nach Fehler | nein |
| Terminal: Befehls-Gerüst (`zeige`) | **ja** (Befehl ausgeschrieben) | ja, knapper Text | nein | nein |
| Terminal: Tipp zu falschem Befehl | ausführlich + Beispiel | knapp | knapp | nein |
| Terminal: Werkzeugleiter | **alle 6 Sprossen** sichtbar | sichtbar | erst nach Fehler | nein |
| Leiste/Mini: Hilfe-Knopf | bei jeder Frage, **stufenweise** (2 Hilfen) | bei jeder Frage (1 Hilfe) | nur nach falscher Antwort | nein |
| Leiste/Mini: Anker („wo steht das?") | **immer** nach der Antwort | nach der Antwort | nur bei Fehler | nein |
| Trainingsbereich: geführte Simulation | **angeboten, mit Gerüst** | angeboten, ohne Gerüst | Vorratsliste | nein |
| Simulation: Gründe in Klartext | ausführlich (E-Stufe) | ausführlich (E-Stufe) | knapp (AP1) | nur Codes |
| Konsole (CLI): `einstieg`, Tipps | `einstieg:true`, `tipps:"alle"` | `einstieg:true`, `tipps:"fehler"` | `einstieg:false`, `tipps:"fehler"` | `einstieg:false`, `tipps:"keine"` |

**Hilfen sind schrittweise, nie alle auf einmal.** Jede Stufe hat einen *Vorrat* (Kontingent), der mit jeder
geöffneten Sprosse kleiner wird. Der Vorrat wird **nur** durch Hilfen verbraucht, nie durch Fehler.

> **Nachgetragen 07.10.2026 nach dem Gegenprüfungsbefund B1 von `prüfer-vertrag`:** Die Erklärtiefe ist eine
> **eigene Achse** (§ 1) und wird *nicht* vom Bildungsstand gesteuert — sie wird bei `setzen()` nur
> **mitgezogen**. Deshalb sind für `azubi` und `azubi-plus` beide Male ausführliche Texte richtig:
> `azubi-plus` unterscheidet sich nicht durch *kürzere Texte*, sondern durch **weniger und knappere
> Vorschläge** (2 statt 1, knapper formuliert) und einen **kleineren Vorrat** (4 statt 6). Wer für
> `azubi-plus` kürzere Erklärtexte will, verstellt die Erklärtiefe — die steht bewusst getrennt.

### 2.2 Wann erscheint eine Hilfe — zweite Abfrage, nicht zweite Wahrheit

> **Nachgetragen 07.10.2026 nach dem Gegenprüfungsbefund B2 von `prüfer-vertrag`:** Die Tabelle oben nennt für
> die Werkzeugleiste, den Mini-Hilfe-Knopf und den Lernanker **„erst nach Fehler"** (`geselle`). Das ist
> **keine** Aussage darüber, *ob* eine Stufe die Fläche hat — das ist `darf()` —, sondern darüber, **wann**
> sie erscheint. Beides muss abfragbar sein, sonst baut jede Fläche die Bedingung selbst nach und es
> entstehen zwei Wahrheiten.

```js
Spiel.stufe.darf("leiter" | "anker" | "miniHilfe" | "training")   // hat diese Stufe die Fläche überhaupt?
Spiel.stufe.wann("leiter" | "anker" | "miniHilfe")                // "immer" | "nachfehler" | "nein"
Spiel.stufe.wannPasst(flaeche, {fehler})                          // -> {ja, grund}
```

* `wann(...)` liefert die Bedingung als Wert, `wannPasst(...)` wertet sie mit dem mitgegebenen Zustand aus
  und gibt **`{ja, grund}`** zurück — nicht `true`/`false`. Die Begründung ist Teil der Antwort, damit eine
  Fläche sie anzeigen kann, ohne die Regel zu kennen.
  **Achtung:** `if (Spiel.stufe.wannPasst("miniHilfe"))` ist immer wahr (Objekt!). Richtig ist
  `if (Spiel.stufe.wannPasst("miniHilfe", {fehler}).ja)`.
* **`darf()` und `wann()` sind zwei verschiedene Fragen.** `darf("leiter")` ist für `geselle` **`true`** —
  die Werkzeugleiste *gibt es*, sie erscheint nur erst nach einem Fehler (`wann("leiter") === "nachfehler"`).
  Wer beides verwechselt, zeigt einem Gesellen die Leiter sofort.
* **Jede Fläche fragt `wannPasst` — keine baut die Fehler-Bedingung selbst nach.** Das ist der Punkt, an dem
  `mini.js` und die Konsole sonst auseinanderlaufen würden.
* Fehlt der Zustand (`fehler` nicht übergeben), gilt er als „noch kein Fehler" — eine Hilfe „nach Fehler"
  erscheint dann nicht. Im Zweifel wird **nichts** verraten.
* `wann("training")` ist nicht belegt und liefert deshalb `"nein"`; der Trainingsbereich ist kein
  Fehler-Hilfsmittel, sondern ein Ort (Regel: unbekannte Fläche → `"nein"`).

### 2.3 Abfragewege der Tabelle (Befund B3)

> **Nachgetragen 07.10.2026 nach dem Gegenprüfungsbefund B3 von `prüfer-vertrag`:** Zwei Zeilen der Tabelle
> hatten keinen Abfrageweg über `Spiel.stufe`; wer sie je Stufe steuern wollte, hätte die Tabelle ein zweites
> Mal ausgewertet. Sie sind jetzt Teil der **einen** Tabelle:

| Frage | `kann(...)` | `darf(...)` |
|---|---|---|
| „Was geht hier?" (Gerüst-Text je Modus) | `kann("wasGeht")` → `"immer"` \| `"nachfehler"` \| `"nein"` | `darf("wasGeht")` — **abgeleitet**: `kann("wasGeht") !== "nein"`. Es gibt dafür bewusst *keine* zweite Tabelle. |
| Befehls-Gerüst (`zeige`) | `kann("geruest")` → `true` \| `"knapp"` \| `false` | `darf("geruest")` — eigener Schalter, weil `"knapp"` zwar vorhanden, aber nicht `true` ist. |
| Konsole: `einstieg`/`tipps` je Stufe | `kann("einstieg")`, `kann("tipps")` | – (Werte, keine Schalter) |


### 2.1 Vorrat (Kontingent) — verbindlich

```
Spiel.HILFE_KONTO = {azubi: 6, "azubi-plus": 4, geselle: 2, meister: 0}
```

* `Spiel.stufe.hilfenFrei()` → noch freie Hilfen dieser Instanz (nicht rückwirkend, **je Ticket**).
* Gezählt wird in `inst.hilfen` (bestehende Liste: `{stufe, t}`) **plus** `inst.hilfenFrei`.
* **Der Vorrat hängt an der Stufe des TICKETS, nicht an der des Menschen.** Trägt `inst.stufe` eine Stufe,
  gilt sie; sonst gilt die Voreinstellung `azubi`. `Spiel.einst.stufe` (Bildungsstand des Menschen)
  bestimmt nur, **welche Hilfe sichtbar ist** — ein Mensch, der mitten im offenen Ticket auf „meister"
  umstellt, verliert den Vorrat dieses Tickets **nicht**. *(Nachgetragen 07.10.2026 nach einem Befund von
  `stufen-bauer`; der Code und `tests/spiel-stufensystem.test.js` halten es so.)*
* Ist der Vorrat leer, ist die nächste Sprosse **nicht gesperrt**, sondern kostet Sterne wie bisher
  (Stufe 4/5 = −½, Stufe 6 = −1). Ein Azubi darf nie in eine Sackgasse laufen — das ist die härteste Regel
  dieses Vertrags. Ein leerer Vorrat ändert nur den Text („jetzt kostet es Sterne").

## § 3 · Datenform: `Spiel.stufe` (neu)

Datei **`src/spiel/stufensystem.js`** — neu, ein Besitzer. Öffentliche Fläche (nichts anderes aufrufen):

```js
Spiel.STUFE = [
  /* Jede Zeile der Tabelle § 2 hat hier ihren Wert — auch die drei Spalten aus § 2.3. */
  {id:"azubi",      rang:1, name:"Azubi (1. Lehrjahr)", kurz:"Azubi", niveau:"E", tipps:"alle", vorschlaege:1,
   leiter:"immer", erklaerung:"ausfuehrlich", wasGeht:"immer", geruest:true, einstieg:true},
  {id:"azubi-plus", rang:2, name:"Azubi (fortgeschritten)", kurz:"Azubi+", niveau:"E", tipps:"fehler", vorschlaege:2,
   leiter:"immer", erklaerung:"ausfuehrlich", wasGeht:"immer", geruest:"knapp", einstieg:true},
  {id:"geselle",    rang:3, name:"Geselle / Prüfungsvorbereitung", kurz:"Geselle", niveau:"AP1", tipps:"fehler", vorschlaege:1,
   leiter:"nachfehler", erklaerung:"knapp", wasGeht:"nachfehler", geruest:false, einstieg:false},
  {id:"meister",    rang:4, name:"Meister / Profi", kurz:"Meister", niveau:"AP2", tipps:"keine", vorschlaege:0,
   leiter:"nein", erklaerung:"nurcodes", wasGeht:"nein", geruest:false, einstieg:false},
];

Spiel.stufe.alle()            // -> Spiel.STUFE (Kopie, nie das Original)
Spiel.stufe.id()              // -> aktueller Bildungsstand, Standard "azubi"
Spiel.stufe.def(id?)          // -> Eintrag
Spiel.stufe.rang(id?)         // -> 1..4
Spiel.stufe.setzen(id, {still}?)   // setzt einst.stufe + zieht einst.niveau nach; sendet "stufe" + "niveau"
Spiel.stufe.kann(frage)       // -> Wert aus der Tabelle: vorschlaege, tipps, niveau, einstieg, wasGeht,
                              //    geruest, leiter, erklaerung; kann("konto") -> Zahl
Spiel.stufe.darf(frage)       // -> true/false: HAT diese Stufe die Fläche? ("leiter", "anker", "miniHilfe",
                              //    "training", "geruest" aus der Schaltertabelle; "wasGeht" ABGELEITET)
Spiel.stufe.wann(flaeche)     // -> "immer" | "nachfehler" | "nein"   WANN erscheint die Fläche? (§ 2.2)
Spiel.stufe.wannPasst(flaeche, {fehler})  // -> {ja, grund}  wertet die Bedingung aus – siehe § 2.2
Spiel.stufe.erklaerung()      // -> "ausfuehrlich" | "knapp" | "nurcodes"
Spiel.stufe.konto()           // -> {frei, gesamt} für die offene Instanz (null ohne Instanz)
Spiel.stufe.hilfenFrei([inst])// -> nur die Zahl (für eine Zeile „noch 3 von 6 Hilfen")
Spiel.stufe.hilfeZiehen(inst) // -> {frei:boolean, grund}  verbraucht EINE freie Hilfe, wenn vorhanden
Spiel.stufe.text(ausfuehrlich, knapp, nurcodes)  // -> den Text der Stufe (nie null)
Spiel.stufe.erklaerungText(id?)  // -> eine Zeile für die Oberfläche (kein DOM)
Spiel.stufe.freigabeText(id?)    // -> eine Zeile „was ist gerade frei" (kein DOM)
```

**Regeln:**
1. Kein Aufruf darf werfen, wenn `einst.stufe` fehlt oder unbekannt ist → Rückfall `"azubi"`.
2. `Spiel.stufe` liest **nie** `L` (Lernmotor) — die Stufe ist eine Voreinstellung, der Lernstand kommt woanders her.
3. `Spiel.stufe.setzen` schreibt über `Spiel.einstSetzen` (nicht direkt in `store`), damit die Oberfläche es merkt.
4. Deterministisch: kein `Math.random`, kein `Date.now` in dieser Datei.
5. **Wer eine Hilfe-Fläche baut, fragt `darf()` UND `wannPasst()` — nie nur eines von beiden**, und baut die
   Fehler-Regel nicht selbst nach (§ 2.2).

## § 4 · Terminal-Hilfe: Datenform `DATEN.vorschlaege`

Neue Datei **`src/daten/hilfen.js`** — Datenpaket, ein Besitzer. Der Kern ruft es über `Spiel.hilfe.passend(...)`,
**nie** über direkte Tabellenzugriffe aus der Oberfläche.

```js
DATEN.hilfen.VORSCHLAEGE = [
  { id: "link-pruefen",           // eindeutig, stabil, Präfix nach Bereich
    bereich: "link",              // = Spiel.LEITER[].id, damit Leiter und Vorschlag dieselbe Sprache sprechen
    skills: ["lab.link"],         // Fertigkeiten, bei denen das passt
    befehl: "show ip interface brief",   // was im Terminal steht (leer = kein Befehl)
    erklaerung: "Überblick: jede Schnittstelle mit Adresse und Status.",  // EIN Satz, warum
    syntax: "show ip interface brief",   // Muster zum Lernen, ggf. mit <Platzhalter>
    geraet: "ios",                // "ios" | "host-windows" | "host-linux" | "fw" | "alle"
    modus: ["priv","config"],     // zulässige CLI-Modi, leer = alle
    ebene: 1,                     // 1..3  (1 = harmlos ansehen, 3 = ändert etwas)
    art: "pruefen"                // "pruefen" (ändert nichts) | "aendern" (ändert Konfiguration)
  }, …
];

DATEN.hilfen.GERUEST = {          // „Was geht hier?“ je Modus — Text, kein Befehl
  ios: {user: "…", priv: "…", config: "…", if: "…", vlan: "…", dhcp: "…", …},
  "host-windows": {…}, "host-linux": {…}, fw: {…}
};

DATEN.hilfen.SYNTAX = {           // Syntax-Brücke: „ich will X" -> „so schreibt man das"
  "ip-adresse-setzen": {titel:"IP-Adresse setzen", ios:"ip address <IP> <Maske>", host:"netsh interface ip set address …", …}
};
```

### 4.1 Der Vorschlagsstreifen (`src/ui/hilfe.js`, Präfix `hl-`)

`UI.hilfe.zeichnen(container, {netz, geraetId, modus, sitzung, letzterFehler})` — die Oberfläche kennt die
Sitzung, weil `UI.konsole` sie hält. **Entscheidung liegt in `Spiel.hilfe`, nicht in der Oberfläche:**

```js
Spiel.hilfe.passend({netz, id, modus, art, verlauf, letzterFehler, max})  // -> [{…vorschlag, warum}]
Spiel.hilfe.geruest({netz, id, modus, art})                               // -> string | null
Spiel.hilfe.leiter({netz, id, skill})                                     // -> Spiel.LEITER + {vorschlag}
Spiel.hilfe.syntaxBruecke({netz, id, modus, text, fehler})                // -> {titel, muster, beispiel} | null
```

**Wo es hängt (verbindlich, sonst ist es wirkungslos — AGENTS.md „Wirkung vor Grün"):**
`UI.konsole.oeffnen` hängt den Streifen **unter** den Schirm, `UI.konsole.ausfuehren` ruft
`UI.hilfe.aktualisieren(K, {letzterFehler: r})` nach jeder Zeile auf, und `UI.konsole.vorschlag` (der
bestehende E-Vorschlag) wird **durch** `Spiel.hilfe` gespeist, damit es nur *eine* Vorschlagsquelle gibt.

## § 5 · Leiste/Mini: Lernanker

`Spiel.mini` bekommt **nichts Neues an Datenformen**, nur zwei Flächen:

```js
Spiel.mini.hilfe(id)        // -> {text, art:"denkhilfe"|"ausschnitt", frei:boolean}   stufenweise, je Frage
Spiel.mini.anker(id)        // -> {titel, text, quelle, wiki:skillId} | null           nach der Antwort
```

* `hilfe` ist **keine** Lösung: es ist der Denkanstoß („Was passiert mit der running-config, wenn der Strom
  ausfällt?") oder ein Ausschnitt aus der Frage. Nie die richtige Option.
* `anker` erscheint **nach** dem Antworten, verknüpft die Frage mit einer Fertigkeit und einem Wiki-Eintrag
  (`UI.wiki.oeffnen(skill)`) und schreibt über `L.ueben(skill, …)` mit — der bestehende Weg, kein neuer.
* Der Hilfe-Knopf steht in `UI.leiste` (`UI.leiste.miniHilfe` DOM-Bereich) **und** im Mini-Overlay aus
  `UI.karriere` — beide Wege müssen ihn zeigen, sonst ist es wieder nur halb (Lehre aus dem DHCP-Pool).

## § 6 · Trainingsbereich: `Spiel.training`

Neue Datei **`src/spiel/training.js`** — Simulationen **abseits der Aufträge**, eigenes Präfix `tr-`,
eigene Ansicht `"training"` (`UI.app.registrieren("training", …)`).

```js
Spiel.TRAINING = [ {id, titel, beschreibung, skill, geraet, art:"basis"|"stoerung"|"pruefung", minuten, geruest:true} … ];
Spiel.training.liste()          // -> [{…def, stand:{versucht, bestanden, sterne}, offen:boolean, grund}]
Spiel.training.starten(id)      // -> {ok, iid} | {ok:false, grund}     legt eine Instanz mit quelle "training" an
Spiel.training.stand()          // -> Spiel.st.training = {je:{[id]:{versucht,bestanden,bestes}}}
Spiel.training.abnehmen(iid, ergebnis)   // schreibt Stand + L.ueben, KEIN Euro/Ruf, KEIN Karrierefortschritt
```

**Regeln:** Training zahlt **kein** Geld und **keinen** Ruf (sonst wird es zur Geldquelle statt zum Üben),
aber es **zählt für den Lernmotor** (`L.ueben`) und für den Trainingsstand. Es erscheint nie im Postfach
und nie in der Karriere-Wertung. Stufe `meister` sieht es nur als Liste ohne Gerüst.

## § 7 · Schreibrechte (damit sich niemand überschreibt)

Ein Besitzer je Datei. Wer eine fremde Datei braucht, ruft ihre öffentliche Fläche auf.

| Baustein | Dateien (Eigentum) |
|---|---|
| Kern-Stufensystem | `src/spiel/stufensystem.js` · `src/ui/stufensystem.js` |
| Terminal-Hilfe | `src/daten/hilfen.js` · `src/spiel/hilfe.js` (**nur anfügen**, s. u.) · `src/ui/hilfe.js` · `src/stil/hilfe.css` · `src/ui/konsole.js` |
| Leiste/Mini | `src/spiel/mini.js` · `src/ui/leiste.js` · `src/ui/karriere.js` · `src/stil/leiste.css` |
| Trainingsbereich | `src/spiel/training.js` · `src/ui/training.js` · `src/stil/training.css` |
| Doku + Bau + Abnahme | `docs/Architektur.md` · `docs/entwicklung/Design – Spielspaß 2.0.md` · `src/ui/app.js` · `AGENTS.md` |

**`src/spiel/hilfe.js` gehört der bestehenden Hilfeleiter.** Der Terminal-Baustein darf dort **nur** am
Dateiende neue Funktionen anfügen (`Spiel.hilfe.*`), keine bestehende Zeile ändern. Das ist die einzige
geteilte Datei — sie wird an genau einer Stelle angefasst.

`bauen.py` nimmt neue Dateien in `src/daten`, `src/spiel`, `src/ui`, `src/stil` **automatisch** auf
(alphabetisch, mit Kopf-/Schlusslisten). Kein Eintrag nötig, keine Reihenfolgeänderung.

## § 8 · Was als „fertig" gilt (Abnahme, sechs Punkte)

1. `node tests/run.js` ist **≥ 251/251 grün**, `python tools/ethos.py` meldet GRÜN.
2. `python bauen.py` läuft durch (Browser-Fassung), keine Ausnahme.
3. Zu jedem Baustein gibt es **eine neue Testdatei** `tests/spiel-<baustein>.test.js` bzw.
   `tests/cli-<baustein>.test.js` nach der Art von `tests/harness.js`.
4. **Wirkung vor Grün:** Der Baustein wird aus dem echten Weg aufgerufen (Terminal-Zeile, Leisten-Knopf,
   Trainingsansicht). Ein Test, der nur seinen eigenen Aufruf prüft, gilt als **nicht fertig**.
5. Die Stufen `azubi` und `meister` sind **beide** durchgespielt: `azubi` kommt ohne Syntaxkenntnis voran,
   `meister` sieht keine ungefragte Hilfe.
6. `docs/Architektur.md` (Stand-Tabelle) und `docs/entwicklung/Design – Spielspaß 2.0.md` (neuer Abschnitt)
   zeigen den echten Zustand.

## § 9 · Offene Punkte (ehrlich, Stand 07.10.2026)

* Die **Android-Fassung ist nicht Teil dieses Auftrags** (Nutzerentscheidung 07.10.2026). `android/bauen.py`
  wird nicht angefasst und nicht neu gebaut.
* Die Zahlen der Tabelle in § 2 sind ein **Startpunkt**, kein Messergebnis. Sie werden nach dem ersten
  Durchspielen nachgezogen — dann aber hier, nicht nur im Code.
