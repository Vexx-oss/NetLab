---
typ: befund
erstellt: 2026-10-09
aktualisiert: 2026-10-09
status: fertig — unsere Seite ist gesichert und gemessen; die Motor-Änderung ist eine Vorlage für die FISI-Spielhalle und NICHT ausgeführt
tags: [FISI, Lernspiel, Netzwerk, Lernmotor, Befund, Falle]
---

# 🧠 Befund – die Lernmotor-Falle

> [!danger] Kurzfassung
> Der Lernmotor (Fahrplan 1.3/2.0 § 2.1 und § 2.2) hat **zwei** Fallen: er wirft einen Lernstand mit
> `v !== 1` **still** weg, und er hält seinen Stand **im Verschluss** — ein Import nach dem Start ist beim
> nächsten `save()` verloren. **Beide sind von unserer Seite nicht heilbar**, denn der Motor gehört der
> FISI-Spielhalle. Auf unserer Seite ist deshalb getan, was hier möglich ist: die Übergabe setzt den
> Lernstand **über den Motor** zurück (`L.reset()` VOR `Spiel.laden()`), die Speicherfüllung läuft
> **vor dem ersten Lesen** des Motors, und eine **Wache** in
> [tests/lernmotor-wache.test.js](<../../tests/lernmotor-wache.test.js>) wird rot, sobald jemand im
> `src/` an der `L.*`-API vorbei direkt in `store["lern"]` schreibt. Der Änderungsvorschlag für die
> Spielhalle steht in **§ 6** — als Vorlage, **nicht ausgeführt**.

## 1 · Der Befund — zwei Zeilen Code, zwei Fallen

Der Motor liest seinen Stand **einmal beim Laden seines Skripts** und hält ihn danach im Verschluss:

```js
let st = (() => { const s = store.get("lern", null); return s && s.v === 1 ? s : leer(); })();
const save = () => store.set("lern", st);
```

| Falle | Was passiert | Warum es still ist |
|---|---|---|
| **A · Wegwerfen** | `s.v === 1` ist streng und **ohne Migration**. Ein Stand mit `v: 2` (oder ohne `v`) wird durch `leer()` ersetzt. | Es gibt **keine Meldung**, keinen Rückfall, keine Sicherung. Der ganze Fortschritt eines Azubis ist weg. |
| **B · Verschluss** | Wer einen importierten Stand **nach** dem Start in den Speicher legt, wird nicht gehört: `save()` schreibt das **alte Objekt des Motors** zurück. | Der Import scheitert **lautlos** — und schlimmer: der nächste `save()` **überschreibt** den Import mit dem Stand des **vorigen** Azubis. |

**Die Zeilennummern, die der Fahrplan nennt, sind die der Kopie.** Gemessen (Test 2 der Wache):

| Datei | Falle A liest | Falle B schreibt |
|---|---|---|
| `fremd/lernmotor.js` (Kopie **mit** 26-zeiligem Herkunftskopf) | `:39` | `:40` |
| `../FISI-Spielhalle/src/lernmotor.js` (Quelle, **die wirklich geladen wird**) | `:13` | `:14` |

Beide Nummernpaare sind richtig — sie zählen nur verschiedene Dateien. Wer in der Spielhalle etwas
ändert, muss `:13/:14` treffen, nicht `:39/:40`.

## 2 · Welche Datei wirklich geladen wird — gemessen, nicht angenommen

> [!warning] Die Kopie ist nicht die geladene Datei
> `fremd/lernmotor.js` trägt im Kopf „FREMDE DATEI — NICHT HIER BEARBEITEN". Auf **diesem** Rechner ist
> sie nicht nur verboten zu ändern, sie wäre auch **wirkungslos**: die danebenliegende Spielhalle hat
> Vorrang.

**Was vorliegt** (Dateisystem, 09.10.2026):

| Datei | Größe | Zeilen | SHA256 (ganze Datei) | geändert |
|---|---|---|---|---|
| `../FISI-Spielhalle/src/lernmotor.js` | 4 221 B | 86 | `66084B817C8912783C49ED27C4B2876B5FF6794050FD17078C29DE2BB8788490` | 29.09.2026, 15:57:38 |
| `fremd/lernmotor.js` (Kopie) | 5 595 B | 112 = 26 Kopf + 86 Rumpf | `8C36309FD29612E77F1E578E8609C6681F0C47528183263234F12096FC6FE98F` | 05.10.2026, 21:17:39 |

**Die Auswahlregel** steht wörtlich in `tests/run.js:13-20` (gleiche Logik in `bauen.py:92-95`):

```js
const LERNMOTOR_QUELLE = path.resolve(WURZEL, "..", "FISI-Spielhalle", "src", "lernmotor.js");
const LERNMOTOR_KOPIE = path.join(WURZEL, "fremd", "lernmotor.js");
function lernmotor() {
  if (fs.existsSync(LERNMOTOR_QUELLE)) return { pfad: LERNMOTOR_QUELLE, kopie: false };
  if (fs.existsSync(LERNMOTOR_KOPIE)) return { pfad: LERNMOTOR_KOPIE, kopie: true };
  throw new Error("Kein Lernmotor gefunden: …");
}
```

**Die Messung** (Nachbau genau dieser Auswahl in einem Node-Einzeiler, dazu der Testlauf selbst):

```
quelleVorhanden: true      kopieVorhanden: true
geladen:  C:\…\Lernprojekte\FISI-Spielhalle\src\lernmotor.js      kopieFlag: false
Testlauf: Geladener Lernmotor → ../FISI-Spielhalle/src/lernmotor.js · Spielhalle liegt daneben → sie hat Vorrang
Testlauf: Gegenprobe Motor    → ../FISI-Spielhalle/src/lernmotor.js:13 liest · ../FISI-Spielhalle/src/lernmotor.js:14 schreibt
bauen.py: if LERNMOTOR_QUELLE.is_file(): return LERNMOTOR_QUELLE, False
```

**Abgleich Kopie ↔ Quelle** — `python tools/lernmotor.py`:

```
Kopie    fremd\lernmotor.js  (86 Zeilen, SHA256 66084b817c891278…)
Quelle   …\FISI-Spielhalle\src\lernmotor.js  (86 Zeilen, SHA256 66084b817c891278…)
  GRUEN: GLEICH — die Kopie entspricht der Quelle Zeile fuer Zeile.
```

**Folgerung (belegt):** Der Rumpf ist gleich, also verhält sich die Kopie heute identisch — sie wird
aber **nicht gelesen**. Eine Änderung an `fremd/lernmotor.js` würde auf diesem Rechner am Testlauf
**und** am Bau vorbeigehen. Eine Änderung gehört in die Spielhalle und wird mit
`python tools/lernmotor.py --neu-einlesen` übernommen, nie umgekehrt.

## 3 · Was auf unserer Seite behoben ist

**3.1 Die Übergabe geht über den Motor, nicht am Motor vorbei.** [`src/spiel/uebergabe.js`](../../src/spiel/uebergabe.js)
ruft bei `lernstandBehalten:false` **`L.reset()` VOR `Spiel.laden()`** (`:34`, Begründung im
Kopfkommentar `:20-24`). Ein direktes Löschen des Speicherschlüssels wäre genau Falle B: der Motor
hätte seinen alten Stand beim nächsten `save()` zurückgeschrieben. `L.reset()` schreibt **über den
Motor** (`fremd/lernmotor.js:109`).

**3.2 Der Speicher ist gefüllt, bevor der Motor liest.** `src/kern/basis.js:134-147` (Frühstart) füllt
`SPEICHER` aus `window.__LABOR_SPEICHER__` bzw. `localStorage` — und `kern` steht in der Ladereihenfolge
**vor** `@lernmotor` (`tests/run.js:23-26`, `bauen.py:38-39`). Damit ist die Reihenfolge „Import vor dem
ersten Lesen" für den **gespeicherten** Stand eingehalten.

**3.3 Die Wache.** [tests/lernmotor-wache.test.js](<../../tests/lernmotor-wache.test.js>) prüft sieben
Dinge; die tragende Zusage lautet: **im ganzen `src/` greift niemand direkt auf `store` „lern" zu** —
der Lernstand geht ausschließlich über die `L.*`-API. Gemessen hält das heute:

```
Wache src/ → 122 Dateien geprüft · 0 Verstöße   (die Zahl wächst mit dem Projekt; die Wache verlangt mindestens 100)
Gegenprobe Motor → ../FISI-Spielhalle/src/lernmotor.js:13 liest · ../FISI-Spielhalle/src/lernmotor.js:14 schreibt
Gegenprobe eingeschleust → 5/5 Schreibweisen gefunden · 0 Fehlalarm in Prosa und Kommentar
Falle von außen → Motor sieht den Fremdstand: false · Speicher hält ihn nach save(): false
17/17 grün (Filter lernmotor), davon 0 übersprungen
```

Die Wache erkennt vier Muster — `store.get/set("lern")`, `store["lern"]`, `SPEICHER.daten.lern`,
`SPEICHER.daten["lern"]` — außerhalb von Kommentaren und meldet **Datei:Zeile**.
Sie ist gegen ein stilles Grün gesichert: sie verlangt **mindestens 100** gefundene Dateien und
`src/spiel/uebergabe.js` im Suchlauf, und die beiden Gegenproben würden einen kaputten Detektor
sofort melden.

**3.4 Der vierte Teil: `lernstandBehalten:false` scheitert nicht still.** Entweder die Übergabe leert
den Stand **wirklich** (Motor **und** Speicher) oder sie lehnt mit einem Grund ab — ein `ok:true` bei
noch vorhandenem Lernstand ist verboten. Zusätzlich: nach `L.reset()` schreibt der Motor weiter, und
eine Marke, die nur im Verschluss lebte, kommt **nicht** zurück.

## 4 · Was nur in der FISI-Spielhalle zu beheben ist

| Falle | Auf unserer Seite möglich? | Begründung |
|---|---|---|
| **A · `v !== 1` wird still weggeworfen** | **teilweise** — siehe Kasten unten | Der Motor liest beim Laden seines Skripts. Was **vor** ihm läuft (`kern/basis.js`), könnte den Speicher vorher migrieren. Eine zweite Stelle für dieselbe Datenform wäre aber ein Vertragsbruch (AGENTS.md: „Vertrag zuerst"); geprüft oder gebaut ist das **nicht**. |
| **B · Verschluss: Import nach dem Start ist verloren** | **nein** | Es gibt keine öffentliche Funktion, die dem Motor einen Stand **setzt**. `L.reset()` kann nur leeren; die API kennt sonst nur `ueben`, `fehler`, `test` — jeder von ihnen schreibt **Daten**, nicht nur den Stand. Ein Import von einer Datei kann den Speicher aber erst füllen, **nachdem** der Motor geladen ist. |

> [!note]- Warum ein „Import vor dem ersten Lesen" im Programm nicht geht
> Für den **gespeicherten** Stand geht es (Frühstart, § 3.2). Für einen **von Hand eingelesenen**
> Lernstand (Datei/Code aus einem anderen Rechner) geht es nicht: der Importknopf wird gedrückt,
> **nachdem** die Seite geladen ist und der Motor sein `st` längst im Verschluss hält. Man müsste die
> Seite neu starten, damit der Import vor dem ersten Lesen im Speicher liegt — genau diese
> Reihenfolge-Abhängigkeit nennt der Entwurf „Mitnehmbarer Lernstand" § 7 den „ersten Testfall der
> Umsetzung" (zitiert nach `docs/entwicklung/Entwurf – Gegenprüfung und Lehrersicht.md:154`).

**Nicht empfohlen, nur der Vollständigkeit halber:** `L.st` gibt das **lebende** Objekt des Motors
zurück (`fremd/lernmotor.js:111`, `get st(){ return st; }`). Ein `Object.assign(L.st, fremd)` würde den
laufenden Motor umbiegen — aber geschrieben wird erst beim nächsten `save()`, und den löst nur der
Motor selbst aus. Das ist ein Eingriff in fremdes Eigentum **und nicht geprüft**; wir bauen es nicht.

## 5 · Der Gegenversuch: die Wache wird nachweislich rot

Gefordert war: „setz testweise einen direkten `store.get("lern")`-Aufruf ein, beleg, dass dein Wächter
rot wird, und nimm ihn wieder zurück."

**Was ich getan habe — und was nicht.** Der Schreibauftrag dieses Schritts umfasst **nur** zwei Dateien
(`tests/lernmotor-wache.test.js` und diesen Befund); `src/` durfte ich nicht anfassen. Ein
Zwischenstand in `src/` wäre zudem für alle parallel arbeitenden Prüfungen sichtbar gewesen — jede
lädt `src/` vollständig. Der Gegenversuch lief deshalb **in meiner eigenen Datei**: ich habe den echten
Aufruf `const LMW_GEGENPROBE = store.get("lern", null);` **in die Wache selbst** gesetzt und den
Suchlauf für die Dauer des Versuchs zusätzlich auf `tests/` gerichtet.

```
✗ Lernmotor-Wache › Wächter: im ganzen src/ geht der Lernstand nur über die L.*-API
6/7 grün, 1 ROT      Exit-Code 1
```

Danach beides zurückgenommen; der nächste Lauf war wieder **17/17 grün, Exit-Code 0**. Der Detektor
selbst ist dauerhaft belegt: Gegenprobe 2 findet die **echten** Zugriffe in
`../FISI-Spielhalle/src/lernmotor.js:13/:14`, Gegenprobe 3 findet **5 von 5** eingeschleusten
Schreibweisen und löst bei Prosa und Kommentaren **keinen** Fehlalarm aus.

**Ehrliche Grenze:** die genaue Liste der in diesem roten Lauf gemeldeten Dateien habe ich **nicht**
mitgeschrieben (mein Ausgabefilter schnitt sie weg). Dass der Lauf rot wurde, ist belegt; **welche**
Dateien in der Meldung standen, ist **nicht geprüft**. Die scharfe Fassung gegen `src/` kann jeder mit
Schreibrecht so nachfahren (setzt voraus, dass `src/` bearbeitet werden darf; Zeilenenden bleiben LF):

```powershell
$f = "src\spiel\uebergabe.js"
$alt = [System.IO.File]::ReadAllText($f)
[System.IO.File]::WriteAllText($f, $alt + "`nconst _lmwProbe = store.get(`"lern`", null);`n")
& "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tests/run.js "Wächter"   # → rot, Exit 1, Meldung nennt src/spiel/uebergabe.js
[System.IO.File]::WriteAllText($f, $alt)                                                     # exakt zurück
```

## 6 · Änderungsvorschlag für die FISI-Spielhalle (Vorlage — nicht ausgeführt)

> [!todo] Diese Datei ist eine **Vorlage für den Nutzer**
> Geändert wird `../FISI-Spielhalle/src/lernmotor.js` — **außerhalb** dieses Projektordners. AGENTS.md
> Regel 3 verbietet Änderungen dort; dieser Auftrag hat es **nicht** getan. Nach der Änderung:
> `python tools/lernmotor.py --neu-einlesen`, dann Tests, dann den Befund und die Wache nachziehen (§ 7).

**Vorschlag A — migrieren statt wegwerfen** (Falle A; Muster ist der Spielstand:
`src/spiel/zustand.js:47-53` hebt alte Stände an — `st.v = Math.max(zahl(st.v, 0), Spiel.VERSION)` —,
`:142-150` lehnt zu neue **mit Satz** ab):

```js
const FASSUNG = 1;
const leer = () => ({v:FASSUNG, units:{}, log:[], fehler:[], tage:{}, tests:[]});

/* Nimmt einen beliebigen gespeicherten Stand herein. Alte Fassungen werden aufgefüllt statt verworfen;
   eine zu neue wird NICHT still gelöscht, sondern mit Grund abgelehnt (Muster: Spiel.importPruefen). */
function herein(s){
  if (!s || typeof s !== "object" || Array.isArray(s)) return {st: leer(), grund: null, migriert: false};
  const v = typeof s.v === "number" && isFinite(s.v) ? s.v : 0;
  if (v > FASSUNG) return {st: null, grund: `Lernstand aus neuerer Fassung (v${v}); dieser Motor kennt nur v${FASSUNG}.`, migriert: false};
  const st = Object.assign({v: FASSUNG}, s);          /* vorhandene Felder bleiben erhalten */
  if (!st.units  || typeof st.units !== "object" || Array.isArray(st.units)) st.units = {};
  if (!st.tage   || typeof st.tage  !== "object" || Array.isArray(st.tage))  st.tage  = {};
  if (!Array.isArray(st.log))    st.log    = [];
  if (!Array.isArray(st.fehler)) st.fehler = [];
  if (!Array.isArray(st.tests))  st.tests  = [];
  return {st, grund: null, migriert: v !== FASSUNG};
}

let ladeGrund = null;
let st = (() => { const r = herein(store.get("lern", null)); ladeGrund = r.grund; return r.st || leer(); })();
const save = () => store.set("lern", st);
```

**Vorschlag B — ein Import, der ankommt** (Falle B): eine öffentliche Funktion, die den Stand **setzt**
und **selbst speichert**. Damit ist die Reihenfolge „Import vor dem ersten Lesen" nicht mehr nötig:

```js
/* Import von außen (Datei, Code, Klassenraum). Ersetzt den Stand des Motors und schreibt ihn sofort. */
function importieren(neu){
  const r = herein(neu);
  if (!r.st) return {ok: false, grund: r.grund};       /* ehrlich ablehnen statt still leeren */
  st = r.st;
  save();
  return {ok: true, migriert: r.migriert};
}
```

**Zum Schluss in die Rückgabe des Motors** (`return {…}`) aufnehmen:
`importieren, get ladeGrund(){ return ladeGrund; }` — dazu `FASSUNG` statt der festen `1` in `leer()`.

**Warum beides zusammen.** A allein rettet den Fortschritt bei einer Formatänderung, B allein rettet
den Import. Zusammen sind es rund zwanzig Zeilen in **einer** Datei, und die Zusage des Fahrplans
(„Mitnehmbarer Lernstand") wird einlösbar. Die Oberfläche muss danach **nichts** um sortieren: sie ruft
`L.importieren(...)` statt in den Speicher zu schreiben — genau das, was die Wache in § 3.3 rot macht,
wenn es jemand anders versucht.

**Was die Spielhalle ausdrücklich NICHT tun sollte:** den Stand weiterhin still durch `leer()` ersetzen
und `save()` unverändert lassen. Dann bleibt dieser Befund bestehen, und der Import bleibt eine Falle,
die nur beim Neustart der Seite funktioniert.

## 7 · Was nach einer Motor-Änderung hier nachzuziehen ist

1. `python tools/lernmotor.py` — meldet **ABWEICHUNG**, solange die Kopie hinterherhinkt.
2. `python tools/lernmotor.py --neu-einlesen` — übernimmt die neue Quelle in die Kopie (nie umgekehrt).
3. `& "C:\Program Files\Git\bin\bash.exe" -c 'export PATH=/usr/bin:/bin:$PATH; sh tools/test.sh'` — der
   ganze Lauf. Erwartung: die Wache bleibt grün — **außer** die Motor-Änderung berührt die zwei Zugriffe
   auf `store` „lern", dann meldet sie sich (Punkt 5).
4. `node tools/sim-stand.js` — die Simulation darf sich **nicht** verändert haben.
5. **Diese Datei und `tests/lernmotor-wache.test.js` nachziehen.** Gegenprobe 2 erwartet **genau zwei**
   Zugriffe auf `store` „lern" (lesen beim Laden, schreiben in `save()`) und die strenge Prüfung
   `s.v === 1`. Genau dafür steht in ihrer Fehlermeldung, was dann zu tun ist — sie ist der Wecker,
   der meldet: „dieser Befund ist überholt".

## 8 · Nicht geprüft

* **Der Motor wurde nicht geändert.** Die Vorschläge aus § 6 sind **nicht ausgeführt** und **nicht
  getestet** — sie sind eine Vorlage. Ob `herein()` wirklich jeden Altstand rettet, ist damit offen.
* **Die FISI-Spielhalle wurde nicht bearbeitet** (Regel 3). Ihre 86 Zeilen sind gelesen, nicht gemessen.
* **Der Gegenversuch lief nicht gegen `src/`** — mein Schreibrecht umfasst nur meine zwei Dateien. Der
  genaue Inhalt der roten Meldung ist nicht mitgeschrieben (§ 5).
* **Nicht geprüft: der Browser.** Alle Messungen laufen über `tests/run.js` in einem vm-Zusammenhang.
  Der Frühstart (`basis.js:137-147`) greift nur mit `window`; im Testlauf startet der Speicher deshalb **leer**.
  Ob sich ein Import im echten Browser (localStorage, Tauri-Initialisierungsskript) gleich verhält, ist
  **nicht** gemessen.
* **Nicht geprüft: die gebaute Fassung.** `grep` findet die beiden Zeilen in `Netzwerk-Labor.html:2536`
  und `docs/index.html:2536` — ob diese Dateien zum aktuellen Quellstand passen, ist **nicht** geprüft
  (`python bauen.py` wurde nicht ausgeführt).
* **Nicht geprüft: der Gesamtstand der Tests.** Meine Läufe sind gefiltert; `tests/run.js:60-67` bewertet
  nur die **gedruckte** Ausgabe. Belegt sind 17/17 grün **im Filter** und „davon 0 übersprungen" für den
  ganzen Lauf — **nicht** die Gesamtzahl grüner Tests.
* **Nicht geprüft: andere Rechner.** Ob dort eine Spielhalle danebenliegt und welche Fassung sie hat, ist
  hier nicht messbar (nur die Dateisysteme dieses Rechners).
* **Nicht geprüft: die Behelfslösung über `L.st`** (§ 4) — sie ist beschrieben, nicht ausprobiert.
* **Fremder Zwischenstand:** Ein Lauf während dieser Arbeit endete mit `LADEFEHLER` (Exit 2) aus
  `tests/klassenraum-hilfevorrat.test.js` („Vorrat je Bildungsstand"), einer parallel in Arbeit
  befindlichen Datei eines anderen Auftrags. Der Lauf danach war wieder grün. Das gehört **nicht** zu
  diesem Befund und ist hier nur vermerkt, damit die Zahl nicht später verwirrt.

## 9 · Belege (in dieser Sitzung ausgeführt)

| Zweck | Befehl / Handlung | Ergebnis |
|---|---|---|
| Kopie ↔ Quelle | `python tools/lernmotor.py` | `GRUEN: GLEICH — die Kopie entspricht der Quelle Zeile fuer Zeile.` |
| Auswahlregel | Node-Einzeiler mit `tests/run.js:13-20` | `geladen = …\FISI-Spielhalle\src\lernmotor.js`, `kopieFlag = false` |
| Vorrang auch im Bau | `bauen.py:92-95` gelesen | `if LERNMOTOR_QUELLE.is_file(): return LERNMOTOR_QUELLE, False` |
| Wache | `node tests/run.js lernmotor` | `17/17 grün`, Exit 0; `Wache src/ → 122 Dateien geprüft · 0 Verstöße` |
| Gegenversuch | Verstoß in die Wache gesetzt, Suchlauf zusätzlich auf `tests/` | `✗ …`, `6/7 grün, 1 ROT`, Exit 1 — danach zurückgenommen |
| Falle B live | Test „Falle (gemessen)" | `Motor sieht den Fremdstand: false · Speicher hält ihn nach save(): false` |
| Zeilenenden | Byte-Zählung | Quelle, Kopie, `tests/spiel-uebergabe.test.js`, `src/spiel/uebergabe.js` und die beiden neuen Dateien: **LF**, 0 × CRLF |
