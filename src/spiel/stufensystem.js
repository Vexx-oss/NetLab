"use strict";
/* ---------- Spiel: Bildungsstand (Stufen der Hilfestellung) ----------
   Verbindlich: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 1–§ 3.

   Drei Achsen sind getrennt (früher hieß alles „Niveau"):
     Spiel.einst.stufe   BILDUNGSSTAND   azubi | azubi-plus | geselle | meister  – Voreinstellung des Menschen
     Spiel.einst.niveau  ERKLÄRTIEFE     E | AP1 | AP2                            – Texte der Konsole/Simulation
     Spiel.einst.wahl    PRÜFUNGSSTRENGE auto | E | AP1 | AP2 (je Ticket)
   Der Bildungsstand wird NIE automatisch geändert und liest NIE den Lernmotor (L) –
   er ist eine Voreinstellung, kein Spielzustand.

   Öffentliche Fläche (nur diese aufrufen; Vertrag § 3):
     Spiel.STUFE                    die vier Stufen (Zahlen sind Vertrag)
     Spiel.HILFE_KONTO              Vorrat an freien Hilfen je Stufe (je Ticket gezählt)
     Spiel.stufe.alle()             -> Kopie der Stufenliste
     Spiel.stufe.id()               -> aktueller Bildungsstand ("azubi" als Rückfall)
     Spiel.stufe.def(id?)           -> Eintrag der Stufe
     Spiel.stufe.rang(id?)          -> 1..4 (vergleiche immer über den Rang, nie über den Namen)
     Spiel.stufe.setzen(id, {still})-> setzt einst.stufe, zieht einst.niveau nach
     Spiel.stufe.kann(frage)        -> Wert aus der Tabelle (vorschlaege, tipps, niveau, einstieg,
                                       wasGeht, geruest, konto …) – JEDE Zeile der Tabelle § 2
     Spiel.stufe.darf(frage)        -> true/false: HAT diese Stufe die Fläche? (leiter, anker, miniHilfe,
                                       training, wasGeht, geruest)
     Spiel.stufe.wann(flaeche)      -> "immer" | "nachfehler" | "nein"  (WANN erscheint sie?)
     Spiel.stufe.wannPasst(flaeche, {fehler}) -> {ja, grund}; wertet die Bedingung aus, damit keine
                                       Fläche die Fehler-Regel selbst nachbaut (Befund B2)
     Spiel.stufe.erklaerung()       -> "ausfuehrlich" | "knapp" | "nurcodes"
     Spiel.stufe.konto([inst])      -> {frei, gesamt} für ein Ticket (ohne Ticket null)
     Spiel.stufe.hilfeZiehen(inst)  -> {frei, grund}; verbraucht EINE freie Hilfe, wenn vorhanden
     Spiel.stufe.ticketStufeSetzen(inst, [id]) -> setzt die Ticket-Stufe AUSDRÜCKLICH (Fahrplan § 2.5);
                                       ohne id gilt der Bildungsstand des Menschen auf diesem Gerät
     Spiel.stufe.text(a, k, n)      -> Text der Stufe, nie null
     Spiel.stufe.erklaerungText(id?)-> eine Zeile: was diese Stufe bedeutet (kein DOM)
     Spiel.stufe.freigabeText(id?)  -> eine Zeile: was diese Stufe freischaltet (kein DOM)

   Regeln: kein Wurf bei fehlendem/unbekanntem einst.stufe (Rückfall "azubi"), kein Math.random,
   kein Date.now. Ein leerer Vorrat SPERRT nicht – er kostet Sterne wie bisher (das regelt der Aufrufer).

   DIE TICKET-STUFE WIRD AUSDRÜCKLICH GESETZT (Fahrplan „1.3 und 2.0" § 2.5, Entwurf E4).
   Bis 09.10.2026 las `alsTicketId` für ein Ticket ohne eigene Stufe `Spiel.EINST_STANDARD` –
   eine stille Konstante: `Spiel.stufe.konto(inst)` lieferte {frei:6, gesamt:6} auch dann, wenn der
   Mensch auf „meister" stand, und sechs Sprossen waren kostenlos (`Spiel.hilfeAbzuege` blieb leer).
   Jetzt gilt: Trägt das Ticket eine Stufe, gilt sie (§ 2.1 „je Ticket" – ein späteres Umstellen des
   Menschen ändert sie NICHT). Trägt es keine, wird die Stufe des Menschen auf DIESEM Gerät
   (`Spiel.einst.stufe`, Rückfall azubi) ausdrücklich am Ticket eingetragen – und zwar dort, wo der
   Vorrat wirklich gebraucht wird: beim offenen Ticket (`konto()`/`hilfenFrei()` ohne Instanz, das ist
   der Weg der Oberfläche) und beim Ziehen einer Sprosse (`Spiel.hilfe`). `Spiel.EINST_STANDARD` ist
   als Vorratsquelle ersatzlos entfallen; für Tickets, die nie durch die Hand des Spiels gehen
   (Attrappen, Altstände), gilt der Vertragsrückfall azubi. */

/* Rückfall für alles Unbekannte. */
Spiel.STUFE_RUECKFALL = "azubi";

/* Vollständige Tabelle § 2. Jede Zeile der Vertragstabelle hat hier ihren Wert, damit keine Fläche
   die Tabelle ein zweites Mal auswertet (Gegenprüfungsbefund B3, 07.10.2026).
   `erklaerung` ist die Erklärtiefe (eigene Achse, § 1): azubi-plus unterscheidet sich NICHT durch
   kürzere Texte, sondern durch weniger/knappere Vorschläge und einen kleineren Vorrat (Befund B1). */
Spiel.STUFE = Object.freeze([
  Object.freeze({id: "azubi",      rang: 1, name: "Azubi (1. Lehrjahr)",             kurz: "Azubi",   niveau: "E",   tipps: "alle",   vorschlaege: 1, leiter: "immer",       erklaerung: "ausfuehrlich", wasGeht: "immer",      geruest: true,     einstieg: true}),
  Object.freeze({id: "azubi-plus", rang: 2, name: "Azubi (fortgeschritten)",         kurz: "Azubi+",  niveau: "E",   tipps: "fehler", vorschlaege: 2, leiter: "immer",       erklaerung: "ausfuehrlich", wasGeht: "immer",      geruest: "knapp",  einstieg: true}),
  Object.freeze({id: "geselle",    rang: 3, name: "Geselle / Prüfungsvorbereitung",  kurz: "Geselle", niveau: "AP1", tipps: "fehler", vorschlaege: 1, leiter: "nachfehler", erklaerung: "knapp",        wasGeht: "nachfehler", geruest: false,    einstieg: false}),
  Object.freeze({id: "meister",    rang: 4, name: "Meister / Profi",                 kurz: "Meister", niveau: "AP2", tipps: "keine",  vorschlaege: 0, leiter: "nein",        erklaerung: "nurcodes",     wasGeht: "nein",       geruest: false,    einstieg: false}),
]);

/* Vorrat an freien Hilfen JE TICKET. Er wird nur durch Hilfen verbraucht, nie durch Fehler. */
Spiel.HILFE_KONTO = Object.freeze({azubi: 6, "azubi-plus": 4, geselle: 2, meister: 0});

/* Schalterfragen, die darf() beantwortet (Tabelle § 2). Hier stehen die Werte, damit Terminal,
   Leiste und Trainingsbereich dieselbe Antwort bekommen und nicht jede Fläche selbst rät.
   `wasGeht` steht hier BEWUSST NICHT: die Spalte ist dreiwertig ("immer"|"nachfehler"|"nein") und
   wird in darf() daraus abgeleitet — eine zweite Tabelle wäre eine zweite Wahrheit für dieselbe
   Aussage (Befund von `stufen-bauer`, 07.10.2026). `geruest` dagegen braucht einen eigenen
   Schalter: dort ist `"knapp"` vorhanden, aber nicht `true`. */
Spiel.STUFEN_SCHALTER = Object.freeze({
  leiter:    Object.freeze({azubi: true,  "azubi-plus": true,  geselle: true,  meister: false}),  /* Werkzeugleiter vorhanden */
  anker:     Object.freeze({azubi: true,  "azubi-plus": true,  geselle: true,  meister: false}),  /* Lernanker vorhanden */
  miniHilfe: Object.freeze({azubi: true,  "azubi-plus": true,  geselle: true,  meister: false}),  /* Hilfe-Knopf in Leiste/Mini vorhanden */
  training:  Object.freeze({azubi: true,  "azubi-plus": true,  geselle: true,  meister: false}),  /* Trainingsbereich angeboten */
  geruest:   Object.freeze({azubi: true,  "azubi-plus": true,  geselle: false, meister: false}),  /* Befehls-Gerüst vorhanden */
});

/* WANN erscheint eine Fläche? — die zweite Frage, getrennt von „hat sie überhaupt" (Befund B2).
   Wer nur darf() fragt, weiß nicht, ob die Fläche sofort oder erst nach einem Fehler kommt.
   Jede Fläche soll wannPasst() benutzen statt die Fehler-Bedingung selbst nachzubauen.
   `vorschlaege` und `syntaxBruecke` sind die beiden Flächen der Terminal-Hilfe (Vertrag § 4.1);
   sie standen bis 09.10.2026 nur im Terminal nachgebaut da (Review „Testqualität", Rest von B2). */
Spiel.STUFEN_WANN = Object.freeze({
  leiter:        Object.freeze({azubi: "immer", "azubi-plus": "immer", geselle: "nachfehler", meister: "nein"}),
  anker:         Object.freeze({azubi: "immer", "azubi-plus": "immer", geselle: "nachfehler", meister: "nein"}),
  miniHilfe:     Object.freeze({azubi: "immer", "azubi-plus": "immer", geselle: "nachfehler", meister: "nein"}),
  wasGeht:       Object.freeze({azubi: "immer", "azubi-plus": "immer", geselle: "nachfehler", meister: "nein"}),
  vorschlaege:   Object.freeze({azubi: "immer", "azubi-plus": "immer", geselle: "nachfehler", meister: "nein"}),
  syntaxBruecke: Object.freeze({azubi: "immer", "azubi-plus": "immer", geselle: "nachfehler", meister: "nein"}),
});

Spiel.stufe = (() => {
  /* Unbekannte oder fehlende ID -> "azubi". Wirft nie (Vertrag § 3, Regel 1).
     Ohne Argument gilt der Bildungsstand des Menschen (Spiel.einst.stufe). */
  const alsId = id => {
    const roh = id === undefined || id === null ? (Spiel.einst ? Spiel.einst.stufe : null) : id;
    return Spiel.STUFE.some(s => s.id === roh) ? roh : Spiel.STUFE_RUECKFALL;
  };
  const alsDef = id => Spiel.STUFE.find(s => s.id === alsId(id));
  /* Vorrat eines Tickets: die Stufe des TICKETS, nicht die des Menschen.
     Trägt das Ticket keine eigene Stufe, gilt der Vertragsrückfall azubi (§ 2.1) – NIE der stille
     Standard `Spiel.EINST_STANDARD`. Dass ein Ticket ohne eigene Stufe trotzdem mit dem richtigen
     Vorrat spielt, besorgt `setzeTicketStufe` unten: die Stufe wird beim ersten echten Zugriff
     AUSDRÜCKLICH am Ticket eingetragen. */
  const alsTicketId = inst => (inst && inst.stufe !== undefined && inst.stufe !== null)
    ? alsId(inst.stufe)
    : Spiel.STUFE_RUECKFALL;
  /* Die Stufe eines Tickets AUSDRÜCKLICH setzen und zurückgeben (idempotent, wirft nie).
     Ohne `id` gilt der Bildungsstand des Menschen auf diesem Gerät (`Spiel.einst.stufe`, Rückfall
     azubi) – der Vorrat des Schülers gilt, aber nie still der Standard. Eine übergebene id gewinnt
     und wird ebenfalls geprüft (unbekannt -> azubi); ein Klassenraum darf damit z. B. „azubi" für
     alle Geräte festschreiben. Steht die Stufe schon am Ticket, bleibt sie unberührt (§ 2.1). */
  const setzeTicketStufe = (inst, id) => {
    const neu = id === undefined || id === null ? alsId() : alsId(id);
    if (!inst || typeof inst !== "object") return neu;
    if (inst.stufe !== undefined && inst.stufe !== null) return alsId(inst.stufe);
    try { inst.stufe = neu; } catch (e) { /* eingefrorenes Ticket: dann gilt der Rückfall in alsTicketId */ }
    return neu;
  };
  const gesamt = inst => Spiel.HILFE_KONTO[alsTicketId(inst)] || 0;
  /* Freie Hilfen: steht die Zahl am Ticket, gilt sie; sonst Vorrat minus verbrauchte Hilfen. */
  const frei = inst => {
    if (!inst || typeof inst !== "object") return 0;
    if (typeof inst.hilfenFrei === "number" && isFinite(inst.hilfenFrei)) return Math.max(0, inst.hilfenFrei);
    return Math.max(0, gesamt(inst) - ((inst.hilfen && inst.hilfen.length) || 0));
  };

  return {
    /* Kopie, nie das Original: sonst könnte ein Aufrufer die Vertragszahlen umschreiben. */
    alle(){ return Spiel.STUFE.map(s => Object.assign({}, s)); },
    id(){ return alsId(); },
    def(id){ return Object.assign({}, alsDef(id)); },
    rang(id){ return alsDef(id).rang; },
    /* Setzt den Bildungsstand und zieht die Erklärtiefe nach (§ 1). Danach darf der Mensch die
       Erklärtiefe einzeln verstellen – nachgezogen wird nur hier, nie im Betrieb.
       `still: true` schreibt, meldet aber nichts auf den Bus (für Tests und stille Vorbelegung). */
    setzen(id, o = {}){
      const neu = alsId(id), def = alsDef(neu);
      const altStufe = Spiel.einst ? Spiel.einst.stufe : null;
      const altNiveau = Spiel.einst ? Spiel.einst.niveau : null;
      /* Über Spiel.einstSetzen schreiben, damit die Oberfläche es merkt (Vertrag § 3, Regel 3);
         fehlt es (Testkapsel), wird der Wert direkt gesetzt – nie ein Wurf. */
      if (typeof Spiel.einstSetzen === "function") {
        Spiel.einstSetzen("stufe", neu);
        if (def.niveau !== altNiveau) Spiel.einstSetzen("niveau", def.niveau);
      } else {
        if (!Spiel._einst) Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
        Spiel._einst.stufe = neu;
        Spiel._einst.niveau = def.niveau;
        try { store.set("einst", Spiel._einst); } catch (e) { /* ohne Speicher (Testkapsel): nur im Zwischenspeicher */ }
      }
      if (!o.still) {
        if (altStufe !== neu) Spiel.melden("stufe", neu);
        if (altNiveau !== def.niveau) Spiel.melden("niveau", def.niveau);
      }
      return Object.assign({}, def);
    },
    /* Wert aus der Tabelle: kann("vorschlaege") === 1, kann("leiter") === "immer".
       "konto" ist die Bequemlichkeit für Flächen, die nur den Vorrat brauchen. */
    kann(frage){
      const def = alsDef();
      if (frage === "konto") return Spiel.HILFE_KONTO[def.id];
      return def[frage];
    },
    /* Schalterfragen: true/false – „hat diese Stufe die Fläche überhaupt?".
       Was nicht in der Tabelle steht, ist false (kein Raten).
       ACHTUNG: „leiter" antwortet auch bei "nachfehler" mit true (vorhanden, aber erst nach einem
       Fehler sichtbar). Für das WANN ist wann()/wannPasst() zuständig – nicht diese Funktion.
       „wasGeht" wird aus der Spalte abgeleitet statt doppelt geführt (07.10.2026). */
    darf(frage){
      if (frage === "wasGeht") return this.kann("wasGeht") !== "nein";   /* eine Aussage, eine Quelle */
      const t = Spiel.STUFEN_SCHALTER[frage];
      return t ? !!t[alsId()] : false;
    },
    /* WANN erscheint die Fläche? -> "immer" | "nachfehler" | "nein".
       Unbekannte Fläche -> "nein" (im Zweifel nichts verraten). */
    wann(flaeche){
      const t = Spiel.STUFEN_WANN[flaeche];
      return t ? (t[alsId()] || "nein") : "nein";
    },
    /* Soll die Fläche JETZT gezeigt werden? `fehler` sagt, ob es in dieser Sitzung schon einen Fehler gab.
       Fehlt der Zustand, gilt „noch kein Fehler" – eine Hilfe „nach Fehler" erscheint dann nicht.
       Gibt zusätzlich `grund` zurück, damit eine Fläche es begründen kann, ohne die Regel zu kennen. */
    wannPasst(flaeche, {fehler = false} = {}){
      const w = this.wann(flaeche);
      if (w === "immer") return {ja: true, grund: "immer sichtbar"};
      if (w === "nachfehler") return fehler
        ? {ja: true, grund: "nach einem Fehler sichtbar"}
        : {ja: false, grund: "erscheint erst nach einem Fehler"};
      return {ja: false, grund: "diese Stufe will keine Hilfe"};
    },
    erklaerung(){ return alsDef().erklaerung; },
    /* Ohne Argument: das offene Ticket (Spiel.st.aktiv). Ohne Ticket: null.
       Das OFFENE Ticket bekommt dabei seine Stufe ausdrücklich eingetragen (setzeTicketStufe):
       es ist das Ticket, an dem der Schüler auf diesem Gerät arbeitet. Wird eine Instanz
       ÜBERGEBEN, wird nichts geschrieben – fremde Attrappen und Altstände bleiben unberührt
       und spielen mit dem Vertragsrückfall azubi. */
    konto(inst){
      const i = inst || Spiel.stufeInstanz();
      if (!i) return null;
      if (!inst) setzeTicketStufe(i);
      return {frei: frei(i), gesamt: gesamt(i)};
    },
    /* Nur die Zahl – für Flächen, die eine Zeile „noch 3 von 6 Hilfen" schreiben.
       Ohne Argument gilt wie bei konto() das OFFENE Ticket (§ 2.1: „je Ticket") – und wie dort wird
       seine Stufe ausdrücklich eingetragen. Bis 07.10.2026 lieferte der Aufruf ohne Argument 0, weil
       hier nur `frei(inst)` stand — gemessen im Review „Testqualität"; ein Aufrufer ohne Instanz
       hätte damit „kein Vorrat" angezeigt. */
    hilfenFrei(inst){
      const i = inst || Spiel.stufeInstanz();
      if (!inst) setzeTicketStufe(i);
      return frei(i);
    },
    /* Die Stufe eines Tickets AUSDRÜCKLICH setzen (Fahrplan § 2.5 / Entwurf E4) und zurückgeben.
       Ohne `id` gilt der Bildungsstand des Menschen auf diesem Gerät (Spiel.einst.stufe, Rückfall
       azubi); eine übergebene id gewinnt (z. B. „azubi" als Ansage für alle Geräte eines Klassenraums).
       Idempotent: steht die Stufe schon am Ticket, bleibt sie (§ 2.1 – ein späteres Umstellen des
       Menschen ändert den Vorrat eines Tickets nicht). Wirft nie, auch nicht ohne Ticket. */
    ticketStufeSetzen(inst, id){ return setzeTicketStufe(inst, id); },
    /* Verbraucht genau EINE freie Hilfe dieses Tickets. Ein leerer Vorrat ist KEINE Sperre:
       frei:false heißt nur „jetzt kostet es Sterne" – der Aufrufer lässt die Sprosse offen.
       WICHTIG: Diese Funktion verbraucht nur den Zähler (`inst.hilfenFrei`). Den Eintrag in `inst.hilfen`
       schreibt der Aufrufer, der die Sprossennummer kennt — hier wäre sie falsch: beim Aufruf VOR der
       Erhöhung entstünde `hilfeStufe + 1`, was beim sechsten Zug einen Phantom-Eintrag „Sprosse 7"
       erzeugte (gemessen 07.10.2026). */
    hilfeZiehen(inst){
      if (!inst || typeof inst !== "object") return {frei: false, grund: "Kein Ticket offen."};
      const war = frei(inst);
      if (war <= 0) return {frei: false, grund: "Keine freie Hilfe mehr – die nächste Sprosse kostet Sterne."};
      const neu = war - 1;
      inst.hilfenFrei = neu;
      Spiel.speichern();
      return {frei: true, grund: neu > 0 ? `Noch ${neu} freie ${neu === 1 ? "Hilfe" : "Hilfen"}.` : "Das war die letzte freie Hilfe."};
    },
    /* Text der Stufe – nie null, nie undefined (auch nicht bei null/undefined-Eingaben). */
    text(ausfuehrlich, knapp, nurcodes){
      const art = alsDef().erklaerung;
      const wahl = art === "ausfuehrlich" ? ausfuehrlich : art === "knapp" ? knapp : nurcodes;
      if (wahl === undefined || wahl === null) return "";
      return typeof wahl === "string" ? wahl : String(wahl);
    },
    /* Eine Zeile: was diese Stufe bedeutet. Steht hier (nicht in der Oberfläche), weil der Text
       ohne DOM prüfbar sein muss und Terminal, Leiste und Training dieselbe Sprache sprechen. */
    erklaerungText(id){
      const d = alsDef(id);
      const je = {
        "azubi":      "Alles wird ausführlich erklärt: Vorschlag mit Syntax, Befehlsgerüst und die Werkzeugleiter sind immer da. Sechs Hilfen je Auftrag sind frei.",
        "azubi-plus": "Knappere Vorschläge (bis zwei), Befehlsgerüst und Werkzeugleiter weiterhin sichtbar. Vier Hilfen je Auftrag sind frei.",
        "geselle":    "Vorschläge und Werkzeugleiter erscheinen erst nach einem Fehler, die Texte sind knapp. Zwei Hilfen je Auftrag sind frei.",
        "meister":    "Keine ungefragte Hilfe, keine Vorschläge, nur Codes. Der Vorrat ist leer – eine Sprosse kostet höchstens Sterne, nie den Auftrag.",
      };
      return `Stufe ${d.rang} von 4 · ${d.kurz}: ${je[d.id] || `${d.name} – keine Beschreibung hinterlegt.`}`;
    },
    /* Eine Zeile: was diese Stufe gerade freischaltet (genau die Schalter aus der Tabelle § 2). */
    freigabeText(id){
      const d = alsDef(id);
      const t = Spiel.STUFEN_SCHALTER;
      const vorrat = Spiel.HILFE_KONTO[d.id] || 0;
      const teile = [];
      /* Wortlaut der beiden ersten Sätze: so steht es auch in der Oberfläche (Befund E, task-23) –
         „mit Syntax" sagt dem Azubi, was der Vorschlag enthält, und meister bekommt die Einzahl. */
      teile.push(d.vorschlaege > 0
        ? `${d.vorschlaege} ${d.vorschlaege === 1 ? "Vorschlag" : "Vorschläge"} mit Syntax im Terminal`
        : "kein Vorschlag im Terminal");
      if (t.leiter[d.id]) teile.push(d.leiter === "immer" ? "Werkzeugleiter immer sichtbar" : "Werkzeugleiter nach einem Fehler");
      else teile.push("keine Werkzeugleiter");
      if (t.miniHilfe[d.id]) teile.push(`Hilfe-Knopf im Mini-Ticket (${vorrat} frei) und in der Leiste (je Auftrag)`);
      else teile.push("kein Hilfe-Knopf in der Leiste");
      if (t.anker[d.id]) teile.push("Lernanker nach der Antwort");
      if (t.training[d.id]) teile.push("geführte Simulationen im Trainingsbereich");
      const tiefe = d.erklaerung === "ausfuehrlich" ? "Erklärungen ausführlich" : d.erklaerung === "knapp" ? "Erklärungen knapp" : "Erklärungen nur als Codes";
      return `${tiefe} · ${teile.join(" · ")}.`;
    },
  };
})();

/* Das offene Ticket, ohne zu werfen (Spiel.aktiveInstanz gibt es erst mit dem Postfach). */
Spiel.stufeInstanz = function(){
  try {
    if (typeof Spiel.aktiveInstanz === "function") return Spiel.aktiveInstanz();
    const st = Spiel.st;
    return st && st.aktiv ? (st.postfach || []).find(i => i.iid === st.aktiv) || null : null;
  } catch (e) { return null; }
};
