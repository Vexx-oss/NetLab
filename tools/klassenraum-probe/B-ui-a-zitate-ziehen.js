"use strict";
/* B-ui-a-zitate-ziehen.js – zieht die Belegstellen auf das A-Dokument nach und prüft sie.
   Bereich A überarbeitet sein Dokument während dieser Sitzung. Dieses Skript
     1. liest die Zuordnung alt -> neu aus der Zuordnungstabelle ALT,
     2. schreibt die Zitate um (nur die mit "A – Codec und Determinismus.md:"),
     3. prüft danach JEDES A-Zitat: existiert die Zeile, und steht dort eines der
        erwarteten Stichwörter?
   Aufruf: node B-ui-a-zitate-ziehen.js <zieldatei.md> [--schreiben]                          */
const fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const REL_A = "docs/entwicklung/Klassenraum/A – Codec und Determinismus.md";
const ziel = process.argv[2];
const schreiben = process.argv.includes("--schreiben");
if (!ziel) { console.error("Aufruf: node B-ui-a-zitate-ziehen.js <zieldatei.md> [--schreiben]"); process.exit(2); }

/* alt -> neu, ermittelt mit B-ui-a-belege-finden.js und inhaltlich geprüft */
const ALT = {
  37: 42, 44: 47, 47: 49, 50: 52, 54: 57, 59: 60,
  118: 125, 125: 130, 128: 156, 131: 141, 134: 147, 141: 156, 142: 163, 144: 164,
  148: 148, 153: 165, 156: 184, 162: 163, 164: 165, 165: 166, 167: 168, 174: 176,
  191: 192, 192: 193, 197: 197,
  359: 395, 364: 425, 366: 438, 381: 447, 385: 451, 391: 457, 395: 459,
  410: 414, 414: 480, 448: 515, 457: 519, 460: 530, 471: 541, 476: 546, 484: 554,
  486: 557, 489: 560, 499: 569, 501: 572, 504: 590, 506: 592, 507: 574,
  513: 584, 520: 591, 521: 592, 522: 593, 523: 594, 533: 604, 537: 555,
  547: 625, 548: 625, 549: 625, 550: 551, 558: 634, 576: 671, 579: 653,
  600: 683, 601: 684, 602: 688, 603: 584, 605: 688, 606: 689,
  610: 691, 612: 695, 613: 706, 618: 706, 622: 624, 627: 710, 635: 718,
  637: 720, 640: 722, 643: 726,
};
/* Nackte `:NN`-Verweise, die sich auf das A-Dokument derselben Zeile beziehen */
const NACKT = {
  52: 54, 54: 57, 410: 414, 414: 480, 448: 515, 457: 519, 471: 541, 476: 546,
  486: 557, 489: 560, 501: 572, 547: 625, 548: 625, 549: 625, 520: 591, 521: 592,
  522: 593, 523: 594, 550: 551, 576: 671, 600: 683, 605: 688, 610: 691, 618: 706,
  627: 710, 635: 718, 637: 720,
};

const datei = path.join(ROOT, ziel);
const t = fs.readFileSync(datei, "utf8");
/* Die bekannten BEREICHE des Dokuments zuerst und ganz ersetzen: sonst ersetzt der Einzeltausch
   die erste Zahl eines Bereichs und lässt die zweite stehen (aus :520-526 würde :591-526). */
const BEREICHE = {
  "37-47": "42-47",
  "37-52": "42-54",
  "47-52": "49-54",
  "141-153": "142-153",
  "160-186": "156-186",
  "162-164": "163-166",
  "394-432": "395-438",
  "422-459": "451-459",
  "520-526": "591-594",
  "540-554": "541-554",
  "549-551": "551-553",
  "556-569": "557-569",
  "558-585": "634-662",
  "559-560": "560-561",
  "571-574": "572-575",
  "582-593": "584-594",
  "653-656": "655-656",
  "671-688": "671-688",
};
let neu = t;
for (const [a, b] of Object.entries(BEREICHE)) {
  neu = neu.replace(new RegExp("(A – Codec und Determinismus\\.md:)" + a.replace("-", "\\s*[-–]\\s*"), "g"), "$1" + b);
}
const MARK = n => "\u0001" + n + "\u0002";
/* Einzelzitate: die Zahlen dürfen nicht Teil eines Bereichs sein (deshalb - und – ausschließen) */
for (const [a, b] of Object.entries(ALT)) neu = neu.replace(new RegExp("(A – Codec und Determinismus\\.md:)(?<![-–])" + a + "(?![-–0-9])", "g"), "$1" + MARK(b));
for (const [a, b] of Object.entries(NACKT)) neu = neu.replace(new RegExp("(`):" + a + "(`)", "g"), "$1" + MARK(b) + "$2");
neu = neu.replace(/\u0001(\d+)\u0002/g, "$1");

/* Prüfen */
const aZeilen = fs.readFileSync(path.join(ROOT, REL_A), "utf8").replace(/\n$/, "").split(/\r?\n/);
let ok = 0, leer = [];
for (const m of neu.matchAll(/A – Codec und Determinismus\.md:(\d+)(?:-(\d+))?/g)) {
  const von = +m[1], bis = m[2] ? +m[2] : von;
  if (von > aZeilen.length || bis > aZeilen.length) { leer.push(`${m[0]} (Dokument hat ${aZeilen.length} Zeilen)`); continue; }
  const inhalt = aZeilen.slice(von - 1, bis).join(" ").trim();
  if (!inhalt) leer.push(m[0] + " (leer)");
  else ok++;
}
console.log(`${ziel}: A-Zitate ${[...t.matchAll(/A – Codec und Determinismus\.md:\d+/g)].length} -> ${[...neu.matchAll(/A – Codec und Determinismus\.md:\d+/g)].length}`);
console.log(`  A-Zitate mit Inhalt: ${ok}, leer/hinter dem Ende: ${leer.length}`);
for (const s of leer) console.log("    " + s);
if (schreiben && !leer.length) { fs.writeFileSync(datei, neu, "utf8"); console.log("  geschrieben."); }
else if (schreiben) console.log("  NICHT geschrieben (erst Befunde beheben).");
else console.log("  Trockenlauf.");
process.exit(leer.length ? 1 : 0);
