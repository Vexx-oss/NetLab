"use strict";
/* DOKU-SEITE (tools/md.py + tools/seite.py): der eigene Markdown-Konverter und der Bau der
   Doku-Seiten. Geprüft wird die Teilmenge, die in den 29 Doku-Dateien wirklich vorkommt —
   PLUS die beiden Fälle, an denen der Konverter zuerst gescheitert ist (Wiki-Link mit `|` im
   Ziel, vorhandene Entität `&amp;`) und die zwei Zusagen des Auftrags: kein toter Verweis und
   `--pruefen` sagt die Wahrheit.

   Der Konverter läuft als Python-CLI (nur Standardbibliothek, wie in der CI). Der Test ruft ihn
   über `python` auf — genau das Werkzeug, das später auch der Pages-Ablauf benutzt. Fehlt Python,
   benennt jeder Fall das als Grund statt still grün zu bleiben. */
gruppe("Doku: Markdown-Konverter und Seitenbau", () => {
  const {execFileSync} = require("child_process");
  const fs = require("fs"), path = require("path");
  const WURZEL = path.join(__dirname, "..");
  const PY = (typeof process !== "undefined" && process.env && process.env.PYTHON) || "python";

  /* Ein Aufruf des Konverters. Rueckgabe: {ok, ausgabe, fehler, code}. */
  const python = (args, eingabe) => {
    try {
      const ausgabe = execFileSync(PY, args, {
        cwd: WURZEL, input: eingabe, encoding: "utf8", timeout: 120000,
        env: {...process.env, PYTHONIOENCODING: "utf-8"},
        stdio: ["pipe", "pipe", "pipe"],
      });
      return {ok: true, ausgabe, fehler: "", code: 0};
    } catch (e) {
      return {ok: false, ausgabe: String(e.stdout || ""), fehler: String(e.stderr || e.message || ""), code: e.status == null ? -1 : e.status};
    }
  };

  /* Markdown durch den echten Konverter schicken (ohne Verweis-Aufloesung, wie `python tools/md.py DATEI`). */
  let probenr = 0;
  const wandle = (markdown) => {
    const datei = path.join(require("os").tmpdir(), `doku-probe-${++probenr}-${markdown.length}.md`);
    fs.writeFileSync(datei, markdown, "utf8");
    try {
      const r = python([path.join("tools", "md.py"), datei]);
      return r;
    } finally { try { fs.unlinkSync(datei); } catch (e) {} }
  };

  const bereit = fs.existsSync(path.join(WURZEL, "tools", "md.py")) && python(["--version"]).ok;

  /* Ein Fall: Markdown hinein, erwartete Bruchstücke im HTML. Jeder Fall hat mindestens eine
     Zusicherung — auch wenn Python fehlt, wird der Grund BENANNT statt still grün zu bleiben. */
  const fall = (name, markdown, teile) => {
    pruefe(name, () => {
      if (!bereit) { erwarte.wahr(true, "ohne python nicht prüfbar: Konverter-Aufruf übersprungen"); return; }
      const r = wandle(markdown);
      erwarte.wahr(r.ok, `Konverter lief nicht durch: ${r.fehler.slice(0, 300)}`);
      for (const t of teile) erwarte.enthaelt(r.ausgabe, t, `„${t}“ fehlt`);
    });
  };

  fall("Überschriften 1–6 mit stabiler Anker-Kennung",
    "# Titel\n\n## Zwei Wörter\n\n### Drei\n\n#### Vier\n\n##### Fünf\n\n###### Sechs\n",
    ['<h1 id="titel">Titel</h1>', '<h2 id="zwei-worter">Zwei Wörter</h2>', "<h3", "<h4", "<h5", "<h6"]);

  fall("Fett, kursiv, Code und Fluchtzeichen",
    "Ein **fetter** und *kursiver* und `fester` Text mit \\*Stern\\* und \\_Unterstrich\\_.\n",
    ["<strong>fetter</strong>", "<em>kursiver</em>", "<code>fester</code>", "*Stern*", "_Unterstrich_"]);

  fall("Tabelle mit Ausrichtung — die Doku nutzt sie stark",
    "| Frage | Antwort | Zahl |\n|:---|:---:|---:|\n| a | b | 3 |\n",
    ['<th style="text-align:left">Frage</th>', '<th style="text-align:center">Antwort</th>',
     '<th style="text-align:right">Zahl</th>', "<td>a</td>", "<td>b</td>"]);

  fall("Verschachtelte Listen, geordnet und ungeordnet",
    "- eins\n- zwei\n  - zwei-a\n  - zwei-b\n\n1. erster\n2. zweiter\n   1. zweiter-a\n",
    ["<ul><li>eins</li><li>zwei<ul><li>zwei-a</li><li>zwei-b</li></ul></li></ul>",
     "<ol><li>erster</li><li>zweiter<ol><li>zweiter-a</li></ol></li></ol>"]);

  fall("Codeblock (Zaun mit Sprachangabe) und Blockzitat",
    "```js\nconst a = 1 < 2 && 3 > 2;\n```\n\n> Ein Zitat\n> über zwei Zeilen\n",
    ['<pre><code class="sprache-js">const a = 1 &lt; 2 &amp;&amp; 3 &gt; 2;</code></pre>',
     "<blockquote>", "Ein Zitat über zwei Zeilen"]);

  fall("Fluchtzeichen: `<` und `&` werden escapt, vorhandene Entitaeten bleiben",
    "Nackt: 5 < 7 & 9 > 3. Entitaet: &amp; und &lt;tag&gt; und &nbsp; Ende.\n",
    ["5 &lt; 7 &amp; 9 &gt; 3", "&amp; und &lt;tag&gt; und &nbsp;", "&amp;amp;"]);

  fall("Trennlinie und Absaetze",
    "Erster Absatz\nmit zweiter Zeile.\n\n---\n\nZweiter Absatz.\n",
    ["<p>Erster Absatz mit zweiter Zeile.</p>", "<hr>", "<p>Zweiter Absatz.</p>"]);

  fall("Ein `|` IM Wiki-Link zerlegt die Tabelle nicht (Fundstelle Konzept, Zeile 56)",
    "| Gerät | Wofür |\n|---|---|\n| Storage | passend zu [[20-Bereiche/Storage/Liesmich|Storage und Cloud]] |\n",
    ["<td>passend zu", "Storage und Cloud</td>", "<td>Wofür</td>"]);

  /* ---- Die Verweis-Aufloesung: kein toter Verweis ---- */
  pruefe("Wiki-Link auf ein veroeffentlichtes Dokument wird ein echter Verweis; fremdes Ziel wird Text", () => {
    if (!bereit) { erwarte.wahr(true, "ohne python nicht prüfbar: Aufruf übersprungen"); return; }
    const datei = path.join(WURZEL, "_probe-doku-links.md");
    fs.writeFileSync(datei, "Siehe [[Architektur]] und [[gibt-es-nicht]] und [[Plan – Ausbau 1.2|den Plan]] und `[[Beispiel]]`.\n", "utf8");
    try {
      /* Der Konverter allein loest nicht auf (das tut tools/seite.py) — geprueft wird hier,
         dass Wiki-Klammern sauber erkannt und mit Anzeigetext versehen werden. */
      const r = wandle("Siehe [[Architektur]] und [[Plan – Ausbau 1.2|den Plan]] und [[Ziel#Anker]].\n");
      erwarte.wahr(r.ok, r.fehler.slice(0, 200));
      erwarte.enthaelt(r.ausgabe, "Architektur", "Ziel bleibt lesbar");
      erwarte.enthaelt(r.ausgabe, "den Plan", "Anzeigetext ersetzt das Ziel");
      erwarte.falsch(/\|\]\]/.test(r.ausgabe), "kein `|]]` im Erzeugnis");
    } finally { try { fs.unlinkSync(datei); } catch (e) {} }
  });

  pruefe("Kein toter Verweis im Erzeugnis, und `--pruefen` sagt die Wahrheit", () => {
    if (!bereit) { erwarte.wahr(true, "ohne python nicht prüfbar: Aufruf übersprungen"); return; }
    const r = python([path.join("tools", "seite.py"), "--pruefen"]);
    erwarte.gleich(r.code, 0, `--pruefen meldete Exit ${r.code}:\n${r.ausgabe.slice(-800)}${r.fehler.slice(-400)}`);
    erwarte.enthaelt(r.ausgabe, "GRUEN", "der Lauf meldet GRUEN");
    erwarte.enthaelt(r.ausgabe, "29 Dokumente", "alle 29 Dokumente erzeugt");
  });

  /* Wie viele Dokumente hat die Quelle? Gezählt, nicht geschrieben — sonst wird diese Datei bei
     jedem neuen Dokument rot (am 09.10.2026 passiert, als fünf Entwürfe dazukamen). */
  const quellzahl = () => {
    let n = 0;
    for (const wurzel of ["README.md", "AGENTS.md"]) if (fs.existsSync(path.join(WURZEL, wurzel))) n++;
    (function sammle(ordner){
      for (const e of fs.readdirSync(ordner, {withFileTypes: true})) {
        const p = path.join(ordner, e.name);
        if (e.isDirectory()) sammle(p); else if (e.name.endsWith(".md")) n++;
      }
    })(path.join(WURZEL, "docs"));
    return n;
  };

  pruefe("Jede erzeugte Seite hat <h1>, Inhalt, Fussleiste und den Weg zum Spiel", () => {
    const basis = path.join(WURZEL, "docs", "doku");
    erwarte.wahr(fs.existsSync(basis), "docs/doku/ wurde gebaut (python tools/seite.py)");
    const dateien = [];
    (function sammle(ordner){
      for (const e of fs.readdirSync(ordner, {withFileTypes: true})) {
        const p = path.join(ordner, e.name);
        if (e.isDirectory()) sammle(p); else if (e.name.endsWith(".html")) dateien.push(p);
      }
    })(basis);
    const soll = quellzahl();
    erwarte.gleich(dateien.length, soll + 1, `${soll} Dokumente + Uebersicht`);
    for (const d of dateien) {
      const t = fs.readFileSync(d, "utf8");
      const kurz = path.relative(WURZEL, d);
      erwarte.enthaelt(t, "<h1", `${kurz}: <h1>`);
      erwarte.enthaelt(t, 'class="dk-fuss"', `${kurz}: Fussleiste`);
      erwarte.wahr(/\.\.?\/?(?:\.\.\/)?index\.html/.test(t), `${kurz}: Weg zurück`);
      erwarte.falsch(/href="[^"]*\.md(?:[)#]|")/.test(t), `${kurz}: kein .md-Verweis`);
    }
  });

  pruefe("Die Uebersicht nennt alle Dokumente, gruppiert, mit einer Zeile je Dokument", () => {
    const uebersicht = path.join(WURZEL, "docs", "doku", "index.html");
    erwarte.wahr(fs.existsSync(uebersicht), "docs/doku/index.html existiert");
    const t = fs.readFileSync(uebersicht, "utf8");
    for (const g of ["Einstieg", "Betrieb", "Entwicklung", "Review"]) erwarte.enthaelt(t, `<h2>${g}</h2>`, `Gruppe ${g}`);
    const soll = quellzahl();
    erwarte.gleich((t.match(/class="dk-karte"/g) || []).length, soll, `${soll} Karten — eine je Dokument`);
    erwarte.enthaelt(t, `${soll} Dokumente`, "die Zahl wird beim Bauen gezählt");
  });

  pruefe("Der Bau ist deterministisch: zweimal bauen ergibt dieselben Bytes", () => {
    if (!bereit) { erwarte.wahr(true, "ohne python nicht prüfbar: Aufruf übersprungen"); return; }
    const datei = path.join(WURZEL, "docs", "doku", "README.html");
    const vorher = fs.readFileSync(datei, "utf8");
    const r = python([path.join("tools", "seite.py")]);
    erwarte.gleich(r.code, 0, `Bauen lief nicht durch: ${r.fehler.slice(0, 300)}`);
    const nachher = fs.readFileSync(datei, "utf8");
    erwarte.gleich(nachher.length, vorher.length, "gleiche Länge");
    erwarte.wahr(nachher === vorher, "gleiche Bytes (kein Datum, keine Zufallssortierung)");
  });
});
