//! Spielstand als Datei: atomar schreiben, täglich sichern (5 rotierend), beschädigte Datei erkennen.
//! Dateiform: {"format":"netzwerk-labor","v":1,"gespeichert":"…Z","daten":{…store…}}

use serde_json::Value;
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

pub const DATEI: &str = "spielstand.json";
const SICHERUNGEN: &str = "sicherungen";
const ANZAHL: usize = 5;
pub const MAX_BYTES: usize = 64 * 1024 * 1024;

pub struct Geladen {
    pub daten: Option<Value>,
    pub meldung: Option<String>,
}

/// UTC-Datum ohne Zusatz-Crate (civil_from_days nach H. Hinnant): (Jahr, Monat, Tag, Sekunde des Tages)
fn jetzt_utc() -> (i64, u32, u32, u64) {
    let s = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let z = (s / 86400) as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    (yoe + era * 400 + i64::from(m <= 2), m, d, s % 86400)
}

pub fn datum_iso() -> String {
    let (y, m, d, _) = jetzt_utc();
    format!("{y:04}-{m:02}-{d:02}")
}

pub fn zeit_iso() -> String {
    let (y, m, d, s) = jetzt_utc();
    format!("{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z", s / 3600, s % 3600 / 60, s % 60)
}

/// Datei-Hülle entfernen; ein rohes Objekt (z. B. Export der Oberfläche) wird so übernommen.
pub fn auspacken(v: Value) -> Result<Value, String> {
    match v {
        Value::Object(mut m) if m.get("format").and_then(Value::as_str) == Some("netzwerk-labor") => match m.remove("daten") {
            Some(d @ Value::Object(_)) => Ok(d),
            _ => Err("Feld „daten“ fehlt".into()),
        },
        v @ Value::Object(_) => Ok(v),
        _ => Err("kein JSON-Objekt".into()),
    }
}

fn lesen(pfad: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(pfad).map_err(|e| e.to_string())?;
    auspacken(serde_json::from_str(&text).map_err(|e| e.to_string())?)
}

/// Sicherungen, neueste zuerst (Dateiname enthält das Datum)
fn sicherungen(ordner: &Path) -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = fs::read_dir(ordner.join(SICHERUNGEN))
        .map(|it| it.filter_map(|e| e.ok().map(|e| e.path())).filter(|p| p.extension().is_some_and(|x| x == "json")).collect())
        .unwrap_or_default();
    v.sort();
    v.reverse();
    v
}

/// "spielstand-2026-09-30.json" → "30.09.2026"
fn datum_de(p: &Path) -> String {
    let stamm = p.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let iso = stamm.get(stamm.len().saturating_sub(10)..).unwrap_or("");
    let t: Vec<&str> = iso.split('-').collect();
    if t.len() == 3 { format!("{}.{}.{}", t[2], t[1], t[0]) } else { iso.to_string() }
}

pub fn atomar_schreiben(pfad: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = pfad.with_extension("tmp");
    let mut f = fs::File::create(&tmp).map_err(|e| format!("{}: {e}", tmp.display()))?;
    f.write_all(bytes).and_then(|_| f.sync_all()).map_err(|e| e.to_string())?;
    drop(f);
    fs::rename(&tmp, pfad).map_err(|e| format!("Umbenennen fehlgeschlagen: {e}"))
}

pub fn laden(ordner: &Path) -> Geladen {
    let pfad = ordner.join(DATEI);
    if !pfad.exists() {
        return Geladen { daten: None, meldung: None };
    }
    if let Ok(d) = lesen(&pfad) {
        return Geladen { daten: Some(d), meldung: None };
    }
    // Beschädigt: aufheben (nicht löschen), letzte gültige Sicherung laden und sofort zur Hauptdatei machen
    let kaputt = ordner.join(format!("spielstand.beschaedigt-{}.json", zeit_iso().replace(':', "-")));
    let _ = fs::rename(&pfad, &kaputt);
    for s in sicherungen(ordner) {
        if let (Ok(d), Ok(roh)) = (lesen(&s), fs::read(&s)) {
            let _ = atomar_schreiben(&pfad, &roh);
            return Geladen {
                daten: Some(d),
                meldung: Some(format!("Dein Spielstand war beschädigt; die Sicherung vom {} wurde geladen.", datum_de(&s))),
            };
        }
    }
    Geladen {
        daten: None,
        meldung: Some("Dein Spielstand war beschädigt, und es gibt keine gültige Sicherung. Das Labor startet leer; die beschädigte Datei bleibt im Datenordner.".into()),
    }
}

/// Einmal am Tag den bisherigen (gültigen) Stand sichern, höchstens ANZAHL Sicherungen behalten.
fn sichern(ordner: &Path, pfad: &Path) {
    let ziel = ordner.join(SICHERUNGEN).join(format!("spielstand-{}.json", datum_iso()));
    if ziel.exists() || !pfad.exists() || lesen(pfad).is_err() {
        return;
    }
    if fs::create_dir_all(ordner.join(SICHERUNGEN)).is_ok() && fs::copy(pfad, &ziel).is_ok() {
        for alt in sicherungen(ordner).into_iter().skip(ANZAHL) {
            let _ = fs::remove_file(alt);
        }
    }
}

pub fn speichern(ordner: &Path, json: &str) -> Result<(), String> {
    if json.len() > MAX_BYTES {
        return Err("Spielstand zu groß".into());
    }
    let v: Value = serde_json::from_str(json).map_err(|e| format!("Kein gültiges JSON: {e}"))?;
    if !v.is_object() {
        return Err("Der Spielstand muss ein JSON-Objekt sein".into());
    }
    fs::create_dir_all(ordner).map_err(|e| e.to_string())?;
    let pfad = ordner.join(DATEI);
    sichern(ordner, &pfad);
    let inhalt = format!("{{\"format\":\"netzwerk-labor\",\"v\":1,\"gespeichert\":\"{}\",\"daten\":{json}}}", zeit_iso());
    atomar_schreiben(&pfad, inhalt.as_bytes())
}
