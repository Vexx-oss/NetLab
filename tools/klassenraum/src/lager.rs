//! Ergebnislager des Live-Servers - bewusst datensparsam.
//!
//! Gespeichert wird **nur**, was zur Ampel noetig ist: Sitzungskennung, Platzkennung, Sterne,
//! Dauer, der Ergebnis-Code als Primaerschluessel und der Zeitpunkt des Eingangs. Kein Klarname,
//! kein Spielername, keine Geraetekennung, keine IP-Adresse. Erzwungen wird das durch die
//! Zeichensatzpruefung in `main.rs::pruefen` (nur `A-Z a-z 0-9 -`), nicht durch guten Willen.

use crate::json::{self, objekt, t, z, Wert};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// Obergrenze des Lagers. Ein Klassensatz hat 30-40 Ergebnisse; 4096 ist reichlich Luft und
/// verhindert, dass ein Scherzkeks den Speicher volllaufen laesst.
pub const MAX_EINTRAEGE: usize = 4096;

#[derive(Debug, Clone, PartialEq)]
pub struct Eintrag {
    pub code: String,
    pub sitzung: String,
    pub platz: String,
    pub sterne: u8,
    pub dauer_s: u32,
    pub eingegangen: u64,
}

pub struct Lager {
    eintraege: Vec<Eintrag>,
    bekannt: HashSet<String>,
    ablage: Option<PathBuf>,
}

impl Lager {
    /// Lager anlegen; eine vorhandene Ablagedatei wird eingelesen (unbrauchbare Zeilen werden
    /// uebersprungen, nicht das ganze Lager verworfen).
    pub fn neu(ablage: Option<PathBuf>) -> Lager {
        let mut l = Lager { eintraege: Vec::new(), bekannt: HashSet::new(), ablage };
        l.laden();
        l
    }

    fn laden(&mut self) {
        let Some(pfad) = self.ablage.clone() else { return };
        let Ok(text) = fs::read_to_string(&pfad) else { return };
        let Ok(w) = json::lesen(&text) else { return };
        let Some(Wert::Liste(liste)) = w.feld("ergebnisse") else { return };
        for e in liste {
            let (Some(code), Some(sitzung), Some(platz)) = (
                e.feld("code").and_then(Wert::text),
                e.feld("sitzung").and_then(Wert::text),
                e.feld("platz").and_then(Wert::text),
            ) else {
                continue;
            };
            let sterne = e.feld("sterne").and_then(Wert::ganze_zahl).unwrap_or(0).clamp(0, 5) as u8;
            let dauer_s = e.feld("dauerS").and_then(Wert::ganze_zahl).unwrap_or(0).clamp(0, 86_400) as u32;
            let eingegangen = e.feld("eingegangenS").and_then(Wert::ganze_zahl).unwrap_or(0).max(0) as u64;
            let code = code.to_uppercase();
            if self.bekannt.insert(code.clone()) {
                self.eintraege.push(Eintrag { code, sitzung: sitzung.to_uppercase(), platz: platz.to_uppercase(), sterne, dauer_s, eingegangen });
            }
        }
    }

    pub fn anzahl(&self) -> usize {
        self.eintraege.len()
    }

    pub fn voll(&self) -> bool {
        self.eintraege.len() >= MAX_EINTRAEGE
    }

    /// Eintragen. `Ok(true)` = neu, `Ok(false)` = derselbe Code war schon da (idempotent).
    pub fn eintragen(&mut self, e: Eintrag) -> Result<bool, String> {
        if self.bekannt.contains(&e.code) {
            return Ok(false);
        }
        if self.voll() {
            return Err(format!("Lager voll ({MAX_EINTRAEGE} Eintraege)"));
        }
        self.bekannt.insert(e.code.clone());
        self.eintraege.push(e);
        self.sichern()?;
        Ok(true)
    }

    /// Alle Einträge einer Sitzung (`None` = alle). Der Server ruft das nur noch mit Filter auf;
    /// ohne Filter bleibt es fuer Tests und spaetere Verwendungen erhalten.
    pub fn liste(&self, sitzung: Option<&str>) -> Vec<&Eintrag> {
        self.eintraege
            .iter()
            .filter(|e| sitzung.map(|s| e.sitzung == s).unwrap_or(true))
            .collect()
    }

    /// Das Lager als JSON-Liste (fuer die Ablagedatei).
    pub fn als_json(&self) -> Wert {
        Wert::Liste(
            self.eintraege
                .iter()
                .map(|e| {
                    objekt(vec![
                        ("code", t(&e.code)),
                        ("sitzung", t(&e.sitzung)),
                        ("platz", t(&e.platz)),
                        ("sterne", z(e.sterne as i64)),
                        ("dauerS", z(e.dauer_s as i64)),
                        ("eingegangenS", z(e.eingegangen as i64)),
                    ])
                })
                .collect(),
        )
    }

    fn sichern(&self) -> Result<(), String> {
        let Some(pfad) = &self.ablage else { return Ok(()) };
        let inhalt = json::schreiben(&objekt(vec![
            ("format", t("klassenraum-ablage")),
            ("v", z(1)),
            ("ergebnisse", self.als_json()),
        ]));
        let tmp = pfad.with_extension("tmp");
        if let Some(eltern) = pfad.parent() {
            if !eltern.as_os_str().is_empty() {
                fs::create_dir_all(eltern).map_err(|e| format!("Ordner {} nicht anlegbar: {e}", eltern.display()))?;
            }
        }
        fs::write(&tmp, inhalt.as_bytes()).map_err(|e| format!("{} nicht schreibbar: {e}", tmp.display()))?;
        fs::rename(&tmp, pfad).map_err(|e| format!("Umbenennen nach {} fehlgeschlagen: {e}", pfad.display()))
    }
}

/// Sekunden seit dem 1.1.1970 (UTC).
pub fn jetzt_s() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

/// "2026-10-06T09:12:31Z" aus Sekunden seit 1970 - ohne fremde Kiste (civil_from_days nach H. Hinnant).
pub fn zeit_iso(s: u64) -> String {
    let tage = (s / 86_400) as i64 + 719_468;
    let era = tage.div_euclid(146_097);
    let doe = tage.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let jahr = yoe + era * 400 + i64::from(m <= 2);
    let rest = s % 86_400;
    format!("{jahr:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z", rest / 3600, rest % 3600 / 60, rest % 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn e(code: &str) -> Eintrag {
        Eintrag { code: code.into(), sitzung: "NL-4F7K".into(), platz: "P3".into(), sterne: 3, dauer_s: 214, eingegangen: 1_759_744_351 }
    }

    #[test]
    fn idempotent_und_gefiltert() {
        let mut l = Lager::neu(None);
        assert!(l.eintragen(e("E-1")).unwrap());
        assert!(!l.eintragen(e("E-1")).unwrap());
        assert_eq!(l.anzahl(), 1);
        let mut f = e("E-2");
        f.sitzung = "NL-ABCD".into();
        assert!(l.eintragen(f).unwrap());
        assert_eq!(l.liste(Some("NL-4F7K")).len(), 1);
        assert_eq!(l.liste(None).len(), 2);
        assert_eq!(l.liste(Some("NL-ABCD")).len(), 1);
        assert_eq!(l.liste(Some("NL-XXXX")).len(), 0);
    }

    #[test]
    fn zeit_ist_iso() {
        assert_eq!(zeit_iso(0), "1970-01-01T00:00:00Z");
        assert_eq!(zeit_iso(1_759_744_351), "2025-10-06T09:52:31Z");
    }
}
