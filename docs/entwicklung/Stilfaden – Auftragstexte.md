# ✍️ Stilfaden – Auftragstexte

> **Stand:** 09.10.2026 · **Anlass:** Rückmeldung des Nutzers: „die Aufgabentexte sind teilweise
> richtig schlecht geschrieben" · **Gilt für:** die 58 Aufträge in `src/daten/tickets-*.js`
> (Feld `symptom` und `titel`). **Gilt nicht für:** Mini-Tickets, Wiki, Trainingskarten, Fehlertexte —
> die sind gemessen in Ordnung.

---

## 0 · Was gemessen schlecht ist (Ist-Stand, `tools/texte-messen.js`)

| Kennzahl | Ist |
|---|---|
| Auftragstext gesamt (Titel + Symptom) | **Median 154 Zeichen**, Minimum **88** |
| Symptom allein | **Median 58 Zeichen** — meist **ein** Satz |
| Aufträge unter 120 Zeichen | **12 von 58** |
| Wörtliche Doppelungen | 0 |
| Wiederkehrende Satzanfänge | „Der Drucker ist…" 3×, „Der Büro-PC…" mehrfach |

**Die Texte sind nicht falsch — sie sind telegrafisch.** Beispiel (Ist):

> **Titel:** Drucker ja, Internet nein
> **Symptom:** Der Büro-PC druckt, kommt aber nicht ins Internet.

Das ist eine **Zustandsmeldung**, kein Auftrag. Es fehlt alles, was einen echten Störungsbericht
ausmacht: **wer** meldet, **wann** es aufgefallen ist, **was** der Kunde sieht, **welche Folge** das
für den Betrieb hat und **was schon versucht** wurde. Genau daraus zieht der Azubi seine Fragen —
und genau das ist der Unterschied zwischen „Aufgabe lösen" und „Störung aufnehmen".

---

## 1 · Die vier Bausteine (Pflicht)

Jeder `symptom`-Text hat **2 bis 4 Sätze** und **180 bis 420 Zeichen** und enthält alle vier:

1. **Anlass mit Zeit** — wann ist es aufgefallen, was war der Auslöser.
   *„Seit heute Morgen geht an der Kasse nichts mehr."* / *„Nach dem Umbau am Wochenende…"*
2. **Beobachtung in Kundensprache** — was geht, was geht nicht, **ohne Deutung**.
   Wörtliche Bildschirmmeldungen sind Gold: *„Auf dem Bildschirm steht: ‚Kein Internet'."*
3. **Folge für den Betrieb** — warum es eilt, was gerade nicht geht.
   *„Wir können keine Kartenzahlung mehr annehmen, die Kundschaft steht bis zur Tür."*
4. **Was schon versucht wurde** — Neustart, anderes Kabel, Kollege gefragt, Stecker gezogen.
   Das ist die wichtigste Zeile für die Diagnose: es zeigt, was **nicht** die Ursache ist.

**Beispiel (Soll):**

> **Titel:** Drucker ja, Internet nein
> **Symptom:** Seit gestern Nachmittag kommen wir vom Büro-PC nicht mehr ins Internet – drucken
> geht weiterhin. Auf dem Bildschirm steht „Kein Internet". Ich habe den Rechner schon neu
> gestartet und das Netzwerkkabel an einen anderen Platz im Switch gesteckt, das hat nichts
> geändert. Ohne Internet können wir keine Bestellungen rausschicken.

---

## 2 · Verboten

* **Die Ursache nennen.** Kein „das VLAN fehlt", kein „die Maske ist falsch", kein „der
  DNS-Eintrag zeigt auf den alten Server". Der Azubi muss **suchen**. Verbotene Wörter im
  Kundentext: *VLAN, Subnetzmaske, Präfix, Gateway, Route, Routing, DNS-Eintrag, Trunk, STP,
  Spanning Tree, DHCP-Pool, Lease, Portsicherheit, ACL, NAT, Firewall-Regel, Doppelvergab* —
  ein Kunde sagt das nicht, und es verrät die Antwort.
* **Fachjargon statt Beobachtung.** „Der Port ist down" → „am Switch leuchtet nichts".
* **Füllwörter und Floskeln**: *irgendwie, quasi, halt, eben, sozusagen, eventuell vielleicht,
  wie gesagt, leider leider*. Ein einziges „leider" ist erlaubt, wenn es echt klingt.
* **Lösungsandeutungen**: „wahrscheinlich ist der Switch kaputt" (falsche Fährte ist erlaubt, aber
  nie als **richtige** Deutung).
* **Anglizismen und Werbesprache.**

## 3 · Erwünscht

* **Der Kunde klingt wie ein Mensch** und wie **sein** Betrieb: Bäckerei herzlich und direkt,
  Praxis höflich und sachlich, Büro nüchtern, Autohaus technisch, Mittelstand knapp.
  Der Ton darf **je Kunde** wechseln — innerhalb eines Auftrags bleibt er gleich.
* **Geräte- und Ortsnamen aus dem Auftragsnetz** dürfen fallen (Kasse, Drucker, Behandlungsraum,
  Lager) — sie gehören zur Beobachtung.
* **Eigennamen der Ansprechpartner** aus der Kundenakte (Vorname genügt), wenn es natürlich klingt.
* **Präzise Beobachtungen statt Adjektive**: „dreimal neu gestartet" schlägt „schon oft probiert".
* **Der Titel** bleibt kurz (15–46 Zeichen), konkret, ohne Fachwort, gern mit dem Charme der
  bestehenden Sammlung („Der Drucker ist beleidigt"). Kein Ausrufezeichen-Stakkato.

## 4 · Was sich NICHT ändert

* **IDs, `netz`, `ziele`, `skills`, `stufe`, `art`, `quelle`** — die Technik hinter dem Auftrag
  bleibt **unangetastet**. Es wird **nur Text** geändert.
* **Die Reihenfolge** der Aufträge in der Datei.
* **Der Charakter** des Auftrags: wer ihn löst, muss weiterhin **dieselbe** Störung beheben.

## 5 · Prüfung (messbar, `tools/texte-messen.js`)

Nach dem Umschreiben muss die Messung zeigen:

| Prüfung | Soll |
|---|---|
| Symptomlänge | **180–420 Zeichen** (kein Auftrag darunter) |
| Sätze je Symptom | **2–4** |
| Zeitmarke im Text | vorhanden (`seit`, `gestern`, `heute`, `nach dem`, `beim`, `letzte Woche` …) |
| Folge im Text | vorhanden („können nicht", „steht still", „müssen warten", „geht nicht raus" …) |
| Versuch im Text | vorhanden („neu gestartet", „probiert", „getauscht", „gefragt", „gezogen" …) |
| Ursachenwörter | **0** (Liste in § 2) |
| Titel | 15–46 Zeichen |
| Doppelungen | 0 wörtliche Sätze über Aufträge hinweg |
