"use strict";
/* TITEL generierter Tickets: aus Kundensicht, nie die Ursache (Injektor-Titel) – gerade am Prüfungstag. */
gruppe("Spiel: Tickettitel aus Kundensicht", () => {
  pruefe("Regeln an echten Zielsätzen", () => {
    const t = (typ, text) => Spiel.titelAusZiel({typ, text});
    erwarte.gleich(t("erreichbar", "Die Filiale kommt ins Internet"), "Die Filiale kommt nicht ins Internet");
    erwarte.gleich(t("erreichbar", "Gäste kommen ins Internet"), "Gäste kommen nicht ins Internet");
    erwarte.gleich(t("erreichbar", "Der Vertrieb erreicht den Webshop (HTTPS)"), "Der Vertrieb erreicht den Webshop (HTTPS) nicht");
    erwarte.gleich(t("erreichbar", "Filiale und Zentrale erreichen sich"), "Filiale und Zentrale erreichen sich nicht");
    erwarte.gleich(t("erreichbar", "Die Kasse druckt Belege auf dem Drucker"), "Die Kasse druckt keine Belege auf dem Drucker");
    erwarte.gleich(t("erreichbar", "PC-Sekretariat druckt"), "PC-Sekretariat druckt nicht");
    erwarte.gleich(t("erreichbar", "Behandlungsraum öffnet die Patientenakten"), "Behandlungsraum öffnet die Patientenakten nicht");
    erwarte.gleich(t("dhcp", "PC-Albers bekommt automatisch eine Adresse"), "PC-Albers bekommt keine Adresse");
    erwarte.gleich(t("blockiert", "Gäste erreichen den Behandlungsraum NICHT"), "Sicherheitslücke: Gäste erreichen den Behandlungsraum");
    erwarte.gleich(t("blockiert", "Aus der DMZ kommt niemand ins interne Netz"), "Sicherheitslücke: Aus der DMZ kommt jemand ins interne Netz");
    erwarte.gleich(t("erreichbar", "Etwas ganz anderes"), null);
  });
  pruefe("generierte Tickets verraten die Ursache nicht im Titel", () => {
    const injTitel = new Set(Object.values(Spiel.INJEKTOREN).map(i => i.titel));
    let n = 0;
    for (const s of (DATEN.skills || []).map(x => x.id)) {
      for (const seed of [1, 2]) {
        let d; try { d = Spiel.generiere(s, seed); } catch (e) { continue; }
        n++;
        erwarte.wahr(!injTitel.has(d.titel), `${d.id}: Titel „${d.titel}“ ist ein Injektor-Titel`);
      }
    }
    erwarte.wahr(n > 20, "genug generierte Tickets geprüft: " + n);
  });
});
