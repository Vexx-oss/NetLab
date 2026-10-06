//! Probe zum QR-Encoder (Stufe D des Auftrags KLASSENRAUM.md) - abhaengigkeitsfrei, nur std.
//!
//! Aufrufe:
//!   C-qr-rust.exe --text "NL-4F7K-2Q" --ecc H --version 1 --maske 0
//!   C-qr-rust.exe --text "NL-4F7K-2Q" --ecc H --json
//!   C-qr-rust.exe --text "NL-4F7K-2Q" --svg qr.svg --data-uri qr.txt
//!   C-qr-rust.exe --selbsttest
//!
//! Ausgabe auf stdout: genau ein JSON-Objekt mit derselben Matrixform wie die unabhaengige
//! Python-Referenz (tools/klassenraum-probe/C-qr-python/qr_referenz.py): "matrix" ist eine
//! Liste von Zeichenketten aus "0" (hell) und "1" (dunkel). Damit lassen sich beide Zelle fuer
//! Zelle vergleichen (Differentialtest).

mod qr;

use qr::{Ecc, Qr};
use std::io::Write;

fn hilfe() -> String {
    "\
QR-Encoder (Model 2, Versionen 1-4, Stufen L/M/Q/H, alphanumerisch und Byte)

  --text TEXT        Inhalt (Pflicht, z. B. NL-4F7K-2Q)
  --ecc STUFE        L, M, Q oder H (Vorgabe H)
  --version N        1 bis 4; ohne Angabe die kleinste passende
  --maske N          0 bis 7; ohne Angabe automatisch nach den Strafregeln
  --svg DATEI        SVG zusaetzlich in eine Datei schreiben
  --data-uri DATEI   Daten-URI (data:image/svg+xml;base64,...) in eine Datei schreiben
  --modul N          Modulgroesse im SVG in Bildpunkten (Vorgabe 8)
  --ruhe N           Ruhezone im SVG in Modulen (Vorgabe 4)
  --selbsttest       eingebaute Pruefungen ausfuehren
  --hilfe            diese Hilfe

Die Matrix steht als JSON auf stdout: {\"text\":...,\"version\":...,\"ecc\":...,\"maske\":...,\"matrix\":[...]}."
        .to_string()
}

/// Ein JSON-Textfeld richtig zitieren.
fn zitat(s: &str) -> String {
    let mut a = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => a.push_str("\\\""),
            '\\' => a.push_str("\\\\"),
            '\n' => a.push_str("\\n"),
            '\r' => a.push_str("\\r"),
            '\t' => a.push_str("\\t"),
            c if (c as u32) < 0x20 => a.push_str(&format!("\\u{:04x}", c as u32)),
            c => a.push(c),
        }
    }
    a.push('"');
    a
}

fn matrix_json(qr: &Qr) -> String {
    let zeilen: Vec<String> = qr.zeilen().iter().map(|z| zitat(z)).collect();
    format!("[{}]", zeilen.join(","))
}

fn ausgabe(qr: &Qr, extra: &str) {
    let json = format!(
        "{{\"text\":{},\"version\":{},\"ecc\":{},\"modus\":{},\"maske\":{},\"auto\":{},\"groesse\":{},\"matrix\":{}{}}}",
        zitat(&qr.text),
        qr.version,
        zitat(qr.ecc.name()),
        zitat(match qr.modus {
            qr::Modus::Alphanumerisch => "alphanumerisch",
            qr::Modus::Byte => "byte",
        }),
        qr.maske,
        qr.automatisch,
        qr.groesse(),
        matrix_json(qr),
        extra
    );
    println!("{json}");
}

fn schreiben(pfad: &str, inhalt: &str) -> Result<(), String> {
    // Bewusst mit LF: die Projektregel fuer neue Dateien lautet UTF-8 und LF.
    let mut f = std::fs::File::create(pfad).map_err(|e| format!("{pfad} nicht schreibbar: {e}"))?;
    f.write_all(inhalt.replace("\r\n", "\n").as_bytes()).map_err(|e| format!("{pfad} nicht schreibbar: {e}"))
}

fn main() {
    let mut text: Option<String> = None;
    let mut stufe = Ecc::H;
    let mut version: Option<u8> = None;
    let mut maske: Option<u8> = None;
    let mut svg_datei: Option<String> = None;
    let mut uri_datei: Option<String> = None;
    let mut modul = 8u32;
    let mut ruhe = 4u32;

    let mut it = std::env::args().skip(1);
    while let Some(a) = it.next() {
        match a.as_str() {
            "--hilfe" | "-h" => {
                println!("{}", hilfe());
                return;
            }
            "--selbsttest" => {
                std::process::exit(selbsttest());
            }
            "--text" => text = it.next(),
            "--ecc" => {
                let v = it.next().unwrap_or_default();
                match Ecc::aus_text(&v) {
                    Some(e) => stufe = e,
                    None => {
                        eprintln!("Fehler: --ecc erwartet L, M, Q oder H, bekam: {v}");
                        std::process::exit(2);
                    }
                }
            }
            "--version" => {
                version = it.next().and_then(|v| v.parse().ok());
                if version.is_none() {
                    eprintln!("Fehler: --version erwartet 1 bis 4");
                    std::process::exit(2);
                }
            }
            "--maske" => {
                let v = it.next().unwrap_or_default();
                if v.eq_ignore_ascii_case("auto") {
                    maske = None;
                } else {
                    maske = v.parse().ok();
                    if maske.is_none() {
                        eprintln!("Fehler: --maske erwartet 0 bis 7 oder auto");
                        std::process::exit(2);
                    }
                }
            }
            "--svg" => svg_datei = it.next(),
            "--data-uri" => uri_datei = it.next(),
            "--modul" => modul = it.next().and_then(|v| v.parse().ok()).unwrap_or(8),
            "--ruhe" => ruhe = it.next().and_then(|v| v.parse().ok()).unwrap_or(4),
            _ => {
                eprintln!("Unbekannte Angabe: {a}\n\n{}", hilfe());
                std::process::exit(2);
            }
        }
    }

    let Some(text) = text else {
        eprintln!("Fehler: --text fehlt\n\n{}", hilfe());
        std::process::exit(2);
    };

    let qr = match qr::bilden(&text, stufe, version, maske) {
        Ok(q) => q,
        Err(f) => {
            eprintln!("Fehler: {f}");
            std::process::exit(1);
        }
    };

    let bild = qr::svg(&qr, modul, ruhe);
    let mut extra = format!(",\"svg_bytes\":{},\"ruhezone\":{},\"modul_px\":{}", bild.len(), ruhe, modul);
    if let Some(p) = &svg_datei {
        if let Err(f) = schreiben(p, &bild) {
            eprintln!("Fehler: {f}");
            std::process::exit(1);
        }
        extra.push_str(&format!(",\"svg_datei\":{}", zitat(p)));
    }
    let uri = format!("data:image/svg+xml;base64,{}", qr::base64(bild.as_bytes()));
    if let Some(p) = &uri_datei {
        if let Err(f) = schreiben(p, &uri) {
            eprintln!("Fehler: {f}");
            std::process::exit(1);
        }
        extra.push_str(&format!(",\"data_uri_datei\":{}", zitat(p)));
    }
    extra.push_str(&format!(",\"data_uri_bytes\":{},\"data_uri_praefix\":\"data:image/svg+xml;base64,\"", uri.len()));
    ausgabe(&qr, &extra);
}

/* ---------- Selbsttest ---------- */

fn fall(text: &str, stufe: Ecc, version: Option<u8>, maske: Option<u8>) -> Result<Qr, String> {
    qr::bilden(text, stufe, version, maske)
}

fn selbsttest() -> i32 {
    // Anker: (Text, Stufe, Version, Maske) -> Kantenlaenge. Die Matrix selbst wird gegen die
    // unabhaengige Python-Referenz verglichen (siehe C-qr-python/vergleich.py).
    let faelle: [(&str, Ecc, u8, Option<u8>); 7] = [
        ("NL-4F7K-2Q", Ecc::H, 1, Some(0)),
        ("NL-4F7K-2Q", Ecc::H, 1, None),
        ("NL-ABCD-12", Ecc::L, 1, Some(3)),
        ("HALLO WELT 1234", Ecc::M, 2, None),
        ("HALLO WELT 1234", Ecc::M, 3, Some(1)),
        ("HALLO WELT 1234", Ecc::L, 4, Some(5)),
        ("NL-ABCD-12", Ecc::H, 4, None),
    ];
    let mut ok = true;
    println!("{{\"selbsttest\":\"QR-Encoder\",\"faelle\":[");
    for (i, (text, stufe, version, maske)) in faelle.iter().enumerate() {
        let ergebnis = fall(text, *stufe, Some(*version), *maske);
        match ergebnis {
            Ok(q) => {
                let kante = q.groesse();
                let dunkel: usize = q.matrix.iter().map(|z| z.iter().filter(|d| **d).count()).sum();
                let erwartete_kante = 17 + 4 * *version as usize;
                let gut = kante == erwartete_kante;
                ok &= gut;
                println!(
                    "{}{{\"text\":{},\"ecc\":{},\"version\":{},\"maske\":{},\"auto\":{},\"kante\":{kante},\"dunkel\":{dunkel},\"ok\":{gut}}}",
                    if i == 0 { "" } else { "," },
                    zitat(text),
                    zitat(stufe.name()),
                    version,
                    q.maske,
                    q.automatisch
                );
            }
            Err(f) => {
                ok = false;
                println!("{}{{\"text\":{},\"fehler\":{}}}", if i == 0 { "" } else { "," }, zitat(text), zitat(&f));
            }
        }
    }
    println!("],\"ok\":{ok}}}");

    // Kapazitaetsgrenzen: 10 Zeichen passen in V1-H, 11 nicht.
    let grenze_ok = fall("NL-4F7K-2Q", Ecc::H, Some(1), None).is_ok() && fall("NL-4F7K-2QX", Ecc::H, Some(1), None).is_err();
    eprintln!("Kapazitaet V1-H: 10 Zeichen ok, 11 Zeichen abgelehnt: {grenze_ok}");
    if ok && grenze_ok {
        0
    } else {
        1
    }
}
