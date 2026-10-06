/* ---------- Android-Anpassung (nur in der App) ----------
   Wird beim APK-Bau als letztes Skript hinter das Spiel gehängt (android/bauen.py,
   Schritt 3). Die Quellen in src/ bleiben unangetastet.

   Hier steht nur, was die Seite nicht selbst kann:
     1. kennzeichnen, dass wir in der App laufen (Klasse am <html>)
     2. den Leisten-Modus stilllegen — er ist auf Maus und Tauri-Fenster gebaut
     3. Spielstand teilen statt herunterladen — Android lädt aus der Seite nicht herunter
     4. das Meta-Tag um `viewport-fit=cover` ergänzen (nur so kommen die sicheren
        Ränder von Notch und Gestenleiste als env(safe-area-inset-*) an)
     5. Telefon-Bedienung: + Knopf für die Geräte, Blatt für das Dock, ⋯-Menü in
        der Kopfzeile. Es werden nur Behälter und Knöpfe ergänzt; geschaltet wird
        über vorhandene Spiel-APIs (UI.labor.dock, UI.modus, UI.app.ansicht).

   Alles in try/catch: eine Anpassung darf das Spiel nie lahmlegen. Läuft dieselbe
   Datei in einem gewöhnlichen Browser (ohne Brücke), tut sie still nichts. */
(function () {
  "use strict";
  var bruecke = (typeof NetzAndroid !== "undefined" && NetzAndroid) ? NetzAndroid : null;
  var d = document;
  var W = window;

  try {
    d.documentElement.classList.add(bruecke ? "nl-android" : "nl-mobil");
  } catch (e) { /* egal */ }

  /* 1. Leisten-Modus stilllegen.
     `leiste.js` öffnet und schließt die Leiste an pointerenter/pointerleave und zieht
     das Fenster per onmousedown — auf einem Telefon gibt es weder Zeiger noch Fenster.
     Statt die Knöpfe zu verstecken, wird der Wechsel abgefangen: der Nutzer erfährt,
     warum nichts passiert, und die Ansicht bleibt benutzbar. */
  try {
    if (typeof UI !== "undefined" && typeof UI.modus === "function") {
      var echterModus = UI.modus;
      UI.modus = function (m) {
        if (m === "leiste" || m === "tray") {
          if (bruecke) { try { bruecke.meldung("Die Leiste gibt es nur im Desktop-Programm."); } catch (e) {} }
          return echterModus() === "voll" ? "voll" : echterModus("voll");
        }
        return echterModus.apply(null, arguments);
      };
    }
  } catch (e) { console.warn("mobil: Leisten-Modus nicht stillgelegt", e); }

  /* 2. Spielstand teilen statt herunterladen.
     Der Browser baut einen Blob und klickt einen <a download> an — im WebView passiert
     dabei nichts. Die App reicht den Text an das Teilen-Menü weiter (Dateien, Drive, Mail). */
  try {
    if (bruecke && typeof PlattformBrowser !== "undefined" && PlattformBrowser.datei) {
      var alterExport = PlattformBrowser.datei.exportieren;
      PlattformBrowser.datei.exportieren = function (name, text) {
        try {
          bruecke.teilen(String(name || "netzwerk-labor.json"), String(text || ""));
          return Promise.resolve(true);
        } catch (e) {
          return alterExport.call(PlattformBrowser.datei, name, text);
        }
      };
    }
  } catch (e) { console.warn("mobil: Teilen nicht eingehängt", e); }

  /* 3. Sichere Ränder. Die Seite bringt `width=device-width, initial-scale=1` mit —
     ohne `viewport-fit=cover` hält die WebView den Satzspiegel aus Statusleiste,
     Notch und Gestenleiste heraus, und env(safe-area-inset-*) bleibt 0. Die Hülle
     kann das nicht setzen (WebSettings kennen kein viewport-fit), also hier.
     Gemessen 06.10.2026: das Meta-Tag steht genau einmal in der Seite. */
  try {
    var mv = d.querySelector('meta[name="viewport"]');
    if (mv) {
      var inhalt = mv.getAttribute("content") || "";
      if (inhalt.indexOf("viewport-fit") === -1) {
        mv.setAttribute("content", inhalt.replace(/\s*$/, "") + ", viewport-fit=cover");
      }
    }
  } catch (e) { console.warn("mobil: viewport-fit nicht gesetzt", e); }

  /* 5. Einpassen nachstoßen, wenn das Netz VOR der Ansicht geladen wurde.
     Gemessen 06.10.2026 (mobilprobe.py --mit-start, Pixel 7 quer 915×412): auf dem
     echten Nutzerpfad — Ticket im Hub öffnen, also erst `laden()`, dann
     `UI.app.ansicht("labor")` (src/ui/spiel.js:46-51) — stand der Zoom auf 0,334
     statt 0,4957; das Netz saß 33 % zu klein links oben. Ursache im Spiel:
     `einpassen()` steigt ohne Flächengröße folgenlos aus und setzt nur die
     Wartemarke (src/ui/editor.js:248-249); `zeigen()` löscht die Marke danach
     trotzdem (Zeile 795), und beim Ansichtswechsel greift der Wächter in Zeile 129
     deshalb nicht mehr — es läuft nur noch `ansichtSetzen()`.

     `src/` ist tabu, also wird hier nachgestoßen. Drei Versuche, weil der
     Ansichtswechsel NACH dem Laden passiert; ein zweiter Aufruf auf schon
     eingepasster Ansicht ist wirkungsgleich (und `einpassen()` steigt von selbst
     folgenlos aus, solange die Fläche unsichtbar ist). Sobald der Nutzer die Fläche
     anfasst, wird nicht mehr nachgepasst: ein selbst gewählter Zoom bleibt stehen. */
  try {
    if (typeof UI !== "undefined" && UI.labor && typeof UI.labor.laden === "function" && !UI.labor.laden.__nlNachstoss) {
      var echterLaden = UI.labor.laden;
      var ladenNr = 0, vomNutzer = false;
      UI.labor.laden = function () {
        var ergebnis = echterLaden.apply(this, arguments);
        var meine = ++ladenNr;
        vomNutzer = false;
        [120, 420, 900].forEach(function (ms) {
          W.setTimeout(function () {
            if (meine !== ladenNr || vomNutzer) return;      /* neueres Laden oder der Nutzer zoomt selbst */
            try { UI.labor.einpassen(false); } catch (e) { /* egal */ }
          }, ms);
        });
        return ergebnis;
      };
      UI.labor.laden.__nlNachstoss = true;
      var anfassen = function (e) {
        try {
          var t = e.target;
          if (t && t.closest && (t.closest(".lb-leinwand") || t.closest(".lb-leiste-oben") || t.closest(".lb-leiste-unten"))) vomNutzer = true;
        } catch (err) { /* egal */ }
      };
      d.addEventListener("pointerdown", anfassen, true);
      d.addEventListener("wheel", anfassen, { capture: true, passive: true });
    }
  } catch (e) { console.warn("mobil: Einpassen nicht nachgestoßen", e); }

  /* ---------------------------------------------------------------- Bedienung
     Im Hochformat trägt die Kopfzeile nur das Zeichen, die drei knappen Werte und
     das ⋯-Menü; alles andere steht hier. Gesucht wird über den Titel, weil
     src/ui/app.js nicht angefasst wird. Im Querformat ist die Kopfzeile breit
     genug — dort blendet mobil.css das ⋯-Menü aus und die Knöpfe stehen wieder da. */
  var SAETZE = [
    { anker: "Befehlspalette", titel: "Suche (Strg+K)", sym: "suche" },
    { anker: "Hell/Dunkel", titel: "Hell / Dunkel", sym: "sonne" },
    { anker: "Einstellungen", titel: "Einstellungen", sym: "zahnrad" },
    { anker: "Zur Leiste", titel: "Leiste (nur Desktop)", sym: "leiste" },
    { anker: "Tastenkürzel", titel: "Tastenkürzel", sym: "hilfe" }
  ];
  var Z = { fabGeraete: null, fabDock: null, griff: null, menue: null, mehr: null };

  function bauen(tag, klasse, attrs) {
    var el = d.createElement(tag);
    if (klasse) el.className = klasse;
    for (var k in (attrs || {})) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    return el;
  }
  function text(el, s) { el.textContent = s; return el; }
  function symbol(name, groesse, ersatz) {
    try { if (typeof UI !== "undefined" && UI.symbol) return UI.symbol(name, groesse); } catch (e) {}
    var s = d.createElement("span");
    s.textContent = ersatz || "+";
    s.style.cssText = "font:700 20px/1 var(--body)";
    return s;
  }

  /* --- Blätter: immer nur EINES offen; der Zustand steht als Klasse am <html> --- */
  function geraeteOffen() { return d.documentElement.classList.contains("nl-geraete-auf"); }
  function geraeteBlatt(auf) {
    var machen = auf === undefined ? !geraeteOffen() : !!auf;
    d.documentElement.classList.toggle("nl-geraete-auf", machen);
    if (machen) dockBlatt(false);
    if (Z.fabGeraete) {
      Z.fabGeraete.classList.toggle("an", machen);
      Z.fabGeraete.setAttribute("aria-expanded", String(machen));
    }
    return machen;
  }
  function dockOffen() {
    try {
      var s = (typeof UI !== "undefined" && UI.labor && UI.labor.dockStand) ? UI.labor.dockStand : null;
      return !!(s && s.da.length && !s.zu);
    } catch (e) { return false; }
  }
  function dockBlatt(auf) {
    var machen = auf === undefined ? !dockOffen() : !!auf;
    try {
      if (typeof UI !== "undefined" && UI.labor && UI.labor.dock) {
        if (machen) UI.labor.dock("inspektor"); else UI.labor.dock(null);
      }
    } catch (e) { console.warn("mobil: Dock nicht umgeschaltet", e); }
    if (machen) geraeteBlatt(false);
    if (Z.fabDock) {
      Z.fabDock.classList.toggle("an", machen);
      Z.fabDock.setAttribute("aria-expanded", String(machen));
    }
    return machen;
  }

  /* --- ⋯-Menü: was in der Kopfzeile keinen Platz hat, steht hier --- */
  function menueBauen() {
    if (Z.menue) return Z.menue;
    var m = bauen("div", "nl-menue", { role: "menu", hidden: "", "aria-label": "Weitere Knöpfe" });
    m.append(text(bauen("div", "menue-titel"), "Mehr"));
    for (var i = 0; i < SAETZE.length; i++) {
      (function (satz) {
        var b = bauen("button", "menue-punkt", { type: "button", role: "menuitem" });
        b.append(symbol(satz.sym, 18, "•"), text(bauen("span", "menue-text"), satz.titel));
        b.onclick = function () { menueZu(); kopfKnopfKlicken(satz.anker); };
        m.append(b);
      })(SAETZE[i]);
    }
    d.body.append(m);
    Z.menue = m;
    return m;
  }
  function kopfKnopfKlicken(anfang) {
    try {
      var alle = d.querySelectorAll(".kopf-knoepfe .kopf-knopf");
      for (var i = 0; i < alle.length; i++) {
        var t = alle[i].getAttribute("title") || alle[i].getAttribute("aria-label") || "";
        if (t.indexOf(anfang) === 0) { alle[i].click(); return true; }
      }
      console.warn("mobil: Kopfzeilen-Knopf nicht gefunden:", anfang);
    } catch (e) { console.warn("mobil: Kopfzeilen-Knopf nicht geklickt", e); }
    return false;
  }
  function menueAuf() {
    var m = menueBauen();
    m.hidden = false;
    if (Z.mehr) {
      var r = Z.mehr.getBoundingClientRect();
      m.style.top = Math.round(r.bottom + 4) + "px";
      m.style.right = "6px";
      m.style.left = "auto";
      Z.mehr.classList.add("an");
      Z.mehr.setAttribute("aria-expanded", "true");
    }
  }
  function menueZu() {
    if (!Z.menue || Z.menue.hidden) return;
    Z.menue.hidden = true;
    if (Z.mehr) { Z.mehr.classList.remove("an"); Z.mehr.setAttribute("aria-expanded", "false"); }
  }
  function menueOffen() { return !!(Z.menue && !Z.menue.hidden); }

  /* --- Einrichtung: läuft nach jedem Neuaufbau der Ansicht noch einmal --- */
  function einrichten() {
    var leinwand = d.querySelector(".lb-leinwand");
    if (!leinwand || typeof UI === "undefined" || !d.querySelector(".labor")) return false;
    /* Nichts zu tun? Dann sofort zurück — der Beobachter ruft oft. */
    if (Z.fabGeraete && Z.fabGeraete.isConnected && Z.fabDock && Z.fabDock.isConnected &&
        Z.griff && Z.griff.isConnected && Z.mehr && Z.mehr.isConnected) return true;

    /* + Knopf (Geräte) und Dock-Knopf: schweben über der Werkzeugzeile */
    if (!Z.fabGeraete || !Z.fabGeraete.isConnected) {
      Z.fabGeraete = bauen("button", "nl-fab nl-fab-geraete", {
        type: "button", "aria-label": "Geräte", "aria-expanded": "false",
        title: "Geräte: Endgeräte, Server, Netzwerk, Außenwelt"
      });
      Z.fabGeraete.append(symbol("plus", 22, "+"), text(bauen("span", "nl-fab-text"), "Gerät"));
      Z.fabGeraete.onclick = function () { geraeteBlatt(); };
      leinwand.append(Z.fabGeraete);
    }
    if (!Z.fabDock || !Z.fabDock.isConnected) {
      Z.fabDock = bauen("button", "nl-fab nl-fab-dock", {
        type: "button", "aria-label": "Inspektor und Dock", "aria-expanded": "false",
        title: "Inspektor, Simulation, Plan, Akte"
      });
      Z.fabDock.append(symbol("inspektor", 22, "▤"), text(bauen("span", "nl-fab-text"), "Dock"));
      Z.fabDock.onclick = function () { dockBlatt(); };
      leinwand.append(Z.fabDock);
    }

    /* Griff am Dock-Blatt: antippen oder nach unten wischen schiebt es zu */
    var dock = d.querySelector(".lb-dock");
    if (dock && (!Z.griff || !Z.griff.isConnected)) {
      Z.griff = bauen("div", "nl-griff", { role: "button", tabindex: "0", "aria-label": "Blatt zuschieben", title: "Zuschieben" });
      var y0 = null;
      Z.griff.onclick = function () { dockBlatt(false); };
      Z.griff.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dockBlatt(false); } };
      Z.griff.addEventListener("pointerdown", function (e) { y0 = e.clientY; });
      Z.griff.addEventListener("pointermove", function (e) {
        if (y0 != null && e.clientY - y0 > 36) { y0 = null; dockBlatt(false); }
      });
      Z.griff.addEventListener("pointerup", function () { y0 = null; });
      Z.griff.addEventListener("pointercancel", function () { y0 = null; });
      dock.prepend(Z.griff);
    }

    /* ⋯ in der Kopfzeile: die drei Knöpfe, die dort keinen Platz haben */
    var knoepfe = d.querySelector(".kopf-knoepfe");
    if (knoepfe) {
      for (var i = 0; i < SAETZE.length; i++) {
        var treffer = null, alle = knoepfe.querySelectorAll(".kopf-knopf");
        for (var j = 0; j < alle.length; j++) {
          var t = alle[j].getAttribute("title") || "";
          if (t.indexOf(SAETZE[i].anker) === 0) { treffer = alle[j]; break; }
        }
        if (treffer) treffer.classList.add("nl-im-menue");
        else console.warn("mobil: Knopf fürs ⋯-Menü nicht gefunden:", SAETZE[i].anker);
      }
      if (!Z.mehr || !Z.mehr.isConnected) {
        Z.mehr = bauen("button", "kopf-knopf nl-mehr", {
          type: "button", "aria-label": "Mehr", "aria-haspopup": "menu", "aria-expanded": "false",
          title: "Weitere Knöpfe: Suche, Leiste, Tastenkürzel"
        });
        var punkte = d.createElement("span");
        punkte.textContent = "⋯";
        punkte.style.cssText = "font:700 22px/1 var(--body)";
        Z.mehr.append(punkte);
        Z.mehr.onclick = function (e) {
          e.stopPropagation();
          if (menueOffen()) menueZu(); else menueAuf();
        };
        knoepfe.append(Z.mehr);
      }
    }
    return true;
  }

  /* Ein Tippen daneben schließt Blatt und Menü. Auf `pointerup` (nicht `click`),
     damit der Klick auf das Ziel nicht verschluckt wird; die eigenen Knöpfe sind
     ausgenommen, sonst schließt und öffnet derselbe Tipp. */
  function daneben(e) {
    try {
      if (menueOffen() && !Z.menue.contains(e.target) && !(Z.mehr && Z.mehr.contains(e.target))) menueZu();
      if (geraeteOffen()) {
        var leiste = d.querySelector(".lb-geraete");
        if (leiste && !leiste.contains(e.target) && !(Z.fabGeraete && Z.fabGeraete.contains(e.target))) geraeteBlatt(false);
      }
    } catch (err) { /* egal */ }
  }
  function taste(e) {
    if (e.key !== "Escape") return;
    menueZu();
    if (geraeteOffen()) geraeteBlatt(false);
  }

  function start() {
    try {
      einrichten();
      if (typeof MutationObserver !== "undefined") {
        var geplant = false;
        new MutationObserver(function () {
          if (geplant) return;
          geplant = true;
          W.requestAnimationFrame(function () { geplant = false; try { einrichten(); } catch (e) {} });
        }).observe(d.body, { childList: true, subtree: true });
      }
    } catch (e) { console.warn("mobil: Telefon-Bedienung nicht eingerichtet", e); }
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  d.addEventListener("pointerup", daneben, false);
  d.addEventListener("keydown", taste, false);

  /* 4. Kleine Selbstauskunft — hilft beim Messen über adb (chrome://inspect). */
  try {
    var probe = bauen("div", "", {});
    probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;" +
      "padding-top:env(safe-area-inset-top, 0px);padding-bottom:env(safe-area-inset-bottom, 0px);" +
      "padding-left:env(safe-area-inset-left, 0px);padding-right:env(safe-area-inset-right, 0px)";
    d.body.append(probe);
    var st = W.getComputedStyle(probe);
    var ränder = { oben: st.paddingTop, unten: st.paddingBottom, links: st.paddingLeft, rechts: st.paddingRight };
    probe.remove();

    W.__nlMobil = {
      inApp: !!bruecke,
      huelle: bruecke ? bruecke.huelle() : null,
      spielVersion: bruecke ? bruecke.spielVersion() : null,
      breite: d.documentElement.clientWidth,
      hoehe: d.documentElement.clientHeight,
      grob: W.matchMedia("(pointer: coarse)").matches,
      telefon: W.matchMedia("(pointer: coarse) and (max-width: 640px), (pointer: coarse) and (max-height: 640px)").matches,
      safeArea: ränder,
      /* Selbstauskunft für die Gegenprobe: Blätter öffnen/schließen und nachsehen */
      blatt: function (name, auf) {
        try {
          if (name === "geraete") return geraeteBlatt(auf);
          if (name === "dock") { dockBlatt(auf); return dockOffen(); }
          if (name === "menue") { if (auf === false) menueZu(); else menueAuf(); return menueOffen(); }
        } catch (e) { return "Fehler: " + e; }
        return null;
      },
      maße: function (sel) {
        try {
          var b = d.querySelector(sel); if (!b) return null;
          var r = b.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        } catch (e) { return null; }
      }
    };
  } catch (e) { /* egal */ }
})();
