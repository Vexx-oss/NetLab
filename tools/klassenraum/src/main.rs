//! Klassenraum-Live-Server, Stufe C2 des Auftrags `tools/auftraege/KLASSENRAUM.md`.
//!
//! Ein eigenstaendiges Programm mit **zwei** Endpunkten, gleiche Datenform wie die eingebaute
//! Fassung (C1) in der Tauri-Huelle:
//!
//! * `GET  /liste`     - Ergebnisse abholen (optional `?sitzung=NL-4F7K`)
//! * `POST /ergebnis`  - ein Ergebnis abgeben, idempotent ueber den Ergebnis-Code
//!
//! Keine fremden Kisten: In dieser Umgebung ist crates.io nicht erreichbar (`cargo fetch`
//! scheitert an SSL/schannel), alles Noetige steckt in der Standardbibliothek. Siehe LIESMICH.md.
//!
//! Datensparsamkeit: Es werden ausschliesslich Sitzungs- und Platzkennungen gespeichert, nie ein
//! Klarname oder Spielername - erzwungen durch Zeichensatzpruefung, nicht durch guten Willen.
//! Kein Zugriffsschutz: Wer im Klassennetz ist, darf lesen und schreiben. Das ist die bewusste
//! Grenze der Hobby-Ebene und steht so in LIESMICH.md.

mod http;
mod json;
mod lager;

use http::Anfrage;
use json::{objekt, t, z, Wert};
use lager::{Eintrag, Lager};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream, UdpSocket};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering::SeqCst};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// Vorgabeport. Bewusst gewaehlt: ueber 1024 (kein privilegierter Port) und **unter** 49152 -
/// darunter beginnt unter Windows der Bereich, aus dem sich das System fuer ausgehende
/// Verbindungen einen Quellport nimmt; ein Server in diesem Bereich wuerde sich selbst ins Gehege
/// kommen. 47112 ist keinem bekannten Dienst zugeordnet.
const VORGABE_PORT: u16 = 47112;
/// So viele Ports werden durchprobiert, wenn der Vorgabeport belegt ist.
const PORT_VERSUCHE: u16 = 10;
/// Hoechstzahl gleichzeitig bedienter Verbindungen. Mehr => 503.
const MAX_VERBINDUNGEN: usize = 16;
/// Wie lange auf ein freies Gehoer gewartet wird, wenn keine Verbindung anliegt.
const WARTE_MS: u64 = 40;

struct Einstellung {
    port: u16,
    bind: Ipv4Addr,
    sitzung: Option<String>,
    ablage: Option<PathBuf>,
    still: bool,
    /// Lebensdauer in Sekunden: danach beendet sich der Server selbst (fuer Proben und fuer
    /// "nur diese Schulstunde"). `None` = laeuft, bis er beendet wird.
    ende_nach: Option<u64>,
}

const HILFE: &str = "\
Klassenraum-Live-Server (Stufe C2) - Ergebnisse im Klassenzimmer einsammeln.

Aufruf:
  klassenraum [--port N] [--bind ADRESSE] [--nur-lokal] [--sitzung CODE]
              [--ablage DATEI] [--still]

  --port N          Vorgabeport (Vorgabe 47112; ist er belegt, werden die naechsten
                    9 Ports probiert, also 47112 bis 47121)
  --bind ADRESSE    Adresse, auf der gehoert wird (Vorgabe 0.0.0.0 = alle Schnittstellen,
                    damit Schuelergeraete im Klassennetz den Lehrer-Rechner erreichen)
  --nur-lokal       Kurzform fuer --bind 127.0.0.1 (nur dieser Rechner; zum Ausprobieren)
  --sitzung CODE    nur Ergebnisse dieser Sitzung annehmen (andere => 409)
  --ablage DATEI    Ergebnisse zusaetzlich als JSON-Datei ablegen (sonst nur im Speicher)
  --ende-nach N     beendet sich nach N Sekunden von selbst (fuer Proben oder fuer eine Schulstunde)
  --still           keine Startanzeige

Endpunkte:
  GET  /liste[?sitzung=CODE]   Ergebnisse abholen (200)
  POST /ergebnis               Ergebnis abgeben (201 neu, 200 schon bekannt)

Beenden: Eingabetaste mit \"q\" oder Strg+C. Der Port wird dabei freigegeben.
";

fn main() {
    let e = match argumente() {
        Ok(Some(e)) => e,
        Ok(None) => {
            print!("{HILFE}");
            return;
        }
        Err(f) => {
            eprintln!("Fehler: {f}\n\n{HILFE}");
            std::process::exit(2);
        }
    };

    let lager = Arc::new(Mutex::new(Lager::neu(e.ablage.clone())));
    let (listener, port) = match binden(e.bind, e.port) {
        Ok(x) => x,
        Err(f) => {
            eprintln!("Fehler: {f}");
            std::process::exit(1);
        }
    };
    if let Err(f) = listener.set_nonblocking(true) {
        eprintln!("Fehler: listener.set_nonblocking: {f}");
        std::process::exit(1);
    }

    if !e.still {
        anzeigen(&e, port, lager.lock().unwrap().anzahl());
    }

    let stop = Arc::new(AtomicBool::new(false));
    let aktiv = Arc::new(AtomicUsize::new(0));

    /* Lebensdauer (falls angegeben): nach N Sekunden selbst beenden - ohne fremdes Zutun. */
    if let Some(sekunden) = e.ende_nach {
        let stop = stop.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(sekunden));
            println!("Lebensdauer von {sekunden} s abgelaufen - der Server beendet sich.");
            stop.store(true, SeqCst);
        });
    }

    /* Beenden ueber die Tastatur: eine Zeile mit "q" beendet sauber (Port wird freigegeben).
       ACHTUNG: Das Ende der Eingabe (kein Terminal, z. B. Start durch ein anderes Programm) darf
       den Server NICHT beenden - sonst waere er als Hintergrundprozess unbrauchbar. Gemessen am
       06.10.2026: Mit umgeleiteter Eingabe kam sofort EOF, und der Server war nach 0,1 s weg. */
    {
        let stop = stop.clone();
        std::thread::spawn(move || {
            use std::io::BufRead;
            let eingabe = std::io::stdin();
            for zeile in eingabe.lock().lines() {
                match zeile {
                    Ok(z) if matches!(z.trim().to_ascii_lowercase().as_str(), "q" | "quit" | "ende" | "exit") => {
                        stop.store(true, SeqCst);
                        return;
                    }
                    Ok(_) => continue,
                    Err(_) => return, // nicht lesbare Eingabe: weiterlaufen
                }
            }
        });
    }

    while !stop.load(SeqCst) {
        match listener.accept() {
            Ok((strom, _peer)) => {
                let lager = lager.clone();
                let aktiv = aktiv.clone();
                let sitzung = e.sitzung.clone();
                if aktiv.fetch_add(1, SeqCst) >= MAX_VERBINDUNGEN {
                    /* Ueber der Obergrenze: ehrlich abweisen. Wichtig ist, die Anfrage vorher
                       wenigstens zu lesen - schliesst der Server mit ungelesenen Daten im
                       Eingangspuffer, schickt Windows ein RST und der Client sieht gar keine
                       Antwort (gemessen am 06.10.2026: curl meldete 000 statt 503). Ausserdem
                       muss der Socket wieder blockierend sein: Auf Windows erbt ein
                       angenommener Socket den Nicht-Blockier-Modus des Horchers. */
                    let mut s = strom;
                    let _ = s.set_nonblocking(false);
                    let _ = s.set_read_timeout(Some(Duration::from_millis(1500)));
                    let _ = s.set_write_timeout(Some(http::ZEITLIMIT));
                    let _ = http::lesen(&mut s);
                    let _ = http::antworten(
                        &mut s,
                        503,
                        "Service Unavailable",
                        "application/json; charset=utf-8",
                        fehler_json("Zu viele gleichzeitige Anfragen").as_bytes(),
                        true,
                        &[("Retry-After", "2")],
                    );
                    aktiv.fetch_sub(1, SeqCst);
                    continue;
                }
                std::thread::spawn(move || {
                    bedienen(strom, lager, sitzung);
                    aktiv.fetch_sub(1, SeqCst);
                });
            }
            Err(ref f) if f.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(WARTE_MS));
            }
            Err(f) => {
                eprintln!("Verbindung nicht angenommen: {f}");
                std::thread::sleep(Duration::from_millis(WARTE_MS));
            }
        }
    }

    /* Port freigeben: den Horcher schliessen (Drop) und den Socket entlassen. */
    drop(listener);
    let n = lager.lock().unwrap().anzahl();
    println!("Server beendet. {n} Ergebnis(se) im Lager. Port {port} ist wieder frei.");
}

/* ---------- Argumente ---------- */

fn argumente() -> Result<Option<Einstellung>, String> {
    let mut e = Einstellung {
        port: VORGABE_PORT,
        bind: Ipv4Addr::UNSPECIFIED,
        sitzung: None,
        ablage: None,
        still: false,
        ende_nach: None,
    };
    let mut it = std::env::args().skip(1);
    while let Some(a) = it.next() {
        match a.as_str() {
            "--hilfe" | "-h" | "--help" => return Ok(None),
            "--port" => {
                let v = it.next().ok_or("--port braucht eine Zahl")?;
                e.port = v.parse().map_err(|_| format!("--port: keine Portnummer: {v}"))?;
                if e.port < 1024 {
                    return Err("--port: Ports unter 1024 sind privilegiert".into());
                }
            }
            "--bind" => {
                let v = it.next().ok_or("--bind braucht eine Adresse")?;
                e.bind = v.parse().map_err(|_| format!("--bind: keine IPv4-Adresse: {v}"))?;
            }
            "--nur-lokal" => e.bind = Ipv4Addr::LOCALHOST,
            "--sitzung" => {
                let v = it.next().ok_or("--sitzung braucht einen Code")?;
                let v = v.to_uppercase();
                if !gueltig(&v, 2, 12) {
                    return Err(format!("--sitzung: erlaubt sind 2 bis 12 Zeichen aus A-Z, a-z, 0-9 und '-' (wird in Grossbuchstaben umgewandelt): {v}"));
                }
                e.sitzung = Some(v);
            }
            "--ablage" => e.ablage = Some(PathBuf::from(it.next().ok_or("--ablage braucht einen Pfad")?)),
            "--ende-nach" => {
                let v = it.next().ok_or("--ende-nach braucht eine Sekundenzahl")?;
                let n: u64 = v.parse().map_err(|_| format!("--ende-nach: keine Zahl: {v}"))?;
                if n < 1 || n > 86_400 {
                    return Err("--ende-nach: erlaubt sind 1 bis 86400 Sekunden".into());
                }
                e.ende_nach = Some(n);
            }
            "--still" => e.still = true,
            _ => return Err(format!("Unbekannte Angabe: {a}")),
        }
    }
    Ok(Some(e))
}

fn binden(bind: Ipv4Addr, port: u16) -> Result<(TcpListener, u16), String> {
    let mut letzter = String::from("kein Versuch");
    for p in port..port.saturating_add(PORT_VERSUCHE) {
        let adresse = SocketAddr::new(IpAddr::V4(bind), p);
        match TcpListener::bind(adresse) {
            Ok(l) => return Ok((l, p)),
            Err(f) => letzter = format!("{adresse}: {f}"),
        }
    }
    Err(format!(
        "Kein freier Port in {port}..{} gefunden. Letzter Fehler: {letzter}",
        port.saturating_add(PORT_VERSUCHE - 1)
    ))
}

/// Adresse dieses Rechners im Klassennetz - ohne fremde Kiste: Ein UDP-Socket wird nur
/// *verbunden* (dabei geht kein Paket hinaus), danach kennt das System die benutzte Quelladresse.
fn lan_adresse() -> Option<Ipv4Addr> {
    let s = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)).ok()?;
    s.connect((Ipv4Addr::new(192, 0, 2, 1), 9)).ok()?; // 192.0.2.0/24 ist fuer Dokumentation reserviert
    match s.local_addr().ok()?.ip() {
        IpAddr::V4(a) if !a.is_unspecified() && !a.is_loopback() => Some(a),
        _ => None,
    }
}

fn anzeigen(e: &Einstellung, port: u16, anzahl: usize) {
    println!("Klassenraum-Live-Server (Stufe C2)");
    println!("  hoert auf   {}:{}", e.bind, port);
    println!("  lokal       http://127.0.0.1:{port}/liste");
    if let Some(a) = lan_adresse() {
        if e.bind.is_unspecified() {
            println!("  Klassennetz http://{a}:{port}/liste");
            println!("              (diese Adresse den Schuelergeraeten nennen)");
        }
    } else if e.bind.is_unspecified() {
        println!("  Klassennetz nicht ermittelbar - pruefe die Netzwerkverbindung");
    }
    match &e.sitzung {
        Some(s) => println!("  Sitzung     {s} (andere Sitzungen werden mit 409 abgelehnt)"),
        None => println!("  Sitzung     alle (kein Filter)"),
    }
    match &e.ablage {
        Some(p) => println!("  Ablage      {} ({anzahl} Ergebnis(se) geladen)", p.display()),
        None => println!("  Ablage      nur im Speicher (geht beim Beenden verloren)"),
    }
    if let Some(s) = e.ende_nach {
        println!("  Lebensdauer {s} s (danach beendet sich der Server selbst)");
    }
    println!("  Beenden     \"q\" + Eingabetaste oder Strg+C - der Port wird freigegeben");
    println!();
}

/* ---------- eine Verbindung bedienen ---------- */

fn bedienen(mut strom: TcpStream, lager: Arc<Mutex<Lager>>, sitzung: Option<String>) {
    let anfrage = match http::lesen(&mut strom) {
        Ok(Some(a)) => a,
        Ok(None) => return,
        Err(f) => {
            let _ = senden(&mut strom, f.status, f.grund, fehler_json(&f.text).as_bytes(), &[]);
            return;
        }
    };

    /* Preflight: gleiche Antwort fuer jeden Pfad - der Browser fragt vor GET/POST. */
    if anfrage.methode == "OPTIONS" {
        let _ = http::antworten(&mut strom, 204, "No Content", "text/plain; charset=utf-8", b"", true, &[]);
        return;
    }

    match (anfrage.methode.as_str(), anfrage.pfad.as_str()) {
        ("GET", "/liste") => liste(&mut strom, &anfrage, &lager, sitzung.as_deref()),
        ("POST", "/ergebnis") => ergebnis(&mut strom, &anfrage, &lager, sitzung.as_deref()),
        /* Bekannter Pfad, falsche Methode: 405 mit Allow (nicht 404 - der Pfad gibt es ja). */
        _ if matches!(anfrage.pfad.as_str(), "/liste" | "/ergebnis") => {
            let allow = if anfrage.pfad == "/liste" { "GET, OPTIONS" } else { "POST, OPTIONS" };
            let _ = http::antworten(
                &mut strom,
                405,
                "Method Not Allowed",
                "application/json; charset=utf-8",
                fehler_json(&format!("{} ist fuer {} nicht erlaubt", anfrage.methode, anfrage.pfad)).as_bytes(),
                true,
                &[("Allow", allow)],
            );
        }
        _ => {
            let _ = http::antworten(
                &mut strom,
                404,
                "Not Found",
                "application/json; charset=utf-8",
                fehler_json(&format!("Unbekannter Pfad: {}", anfrage.pfad)).as_bytes(),
                true,
                &[],
            );
        }
    }
}

fn senden(strom: &mut TcpStream, status: u16, grund: &str, rumpf: &[u8], extra: &[(&str, &str)]) -> std::io::Result<()> {
    http::antworten(strom, status, grund, "application/json; charset=utf-8", rumpf, true, extra)
}

fn fehler_json(meldung: &str) -> String {
    json::schreiben(&objekt(vec![
        ("format", t("klassenraum-fehler")),
        ("v", z(1)),
        ("fehler", t(meldung)),
    ]))
}

fn fehler_feld(meldung: &str, feld: &str) -> String {
    json::schreiben(&objekt(vec![
        ("format", t("klassenraum-fehler")),
        ("v", z(1)),
        ("fehler", t(meldung)),
        ("feld", t(feld)),
    ]))
}

/* ---------- GET /liste ---------- */

fn liste(strom: &mut TcpStream, anfrage: &Anfrage, lager: &Arc<Mutex<Lager>>, vorgabe: Option<&str>) {
    /* Die Sitzungskennung ist PFLICHT - entweder als Abfrageparameter oder beim Start
       (--sitzung). Ohne sie liefert der Server 400 und keine Daten. Begruendung (Befund der
       Gegenpruefung am 06.10.2026): Ohne diese Pflicht gab GET /liste alle Ergebnisse ALLER
       Sitzungen heraus, samt fremder Kennungen - im Schulnetz ohne Anmeldung kann das jede
       Klasse abrufen. Die Oberflaeche kennt die Kennung aus dem Auftragscode und schickt sie
       ohnehin mit. */
    let filter = match anfrage.frage_wert("sitzung") {
        Some(s) => {
            let s = s.to_uppercase();
            if !gueltig(&s, 2, 12) {
                let _ = senden(strom, 400, "Bad Request", fehler_feld("Ungueltige Sitzungskennung", "sitzung").as_bytes(), &[]);
                return;
            }
            s
        }
        None => match vorgabe {
            Some(s) => s.to_string(),
            None => {
                let _ = senden(
                    strom,
                    400,
                    "Bad Request",
                    fehler_feld("Abfrageparameter 'sitzung' fehlt (z. B. /liste?sitzung=NL-4F7K)", "sitzung").as_bytes(),
                    &[],
                );
                return;
            }
        },
    };
    let l = lager.lock().unwrap();
    let treffer = l.liste(Some(&filter));
    let ergebnisse: Vec<Wert> = treffer
        .iter()
        .map(|e| {
            objekt(vec![
                ("platz", t(&e.platz)),
                ("sterne", z(e.sterne as i64)),
                ("dauerS", z(e.dauer_s as i64)),
                ("sitzung", t(&e.sitzung)),
                ("code", t(&e.code)),
                ("eingegangen", t(&lager::zeit_iso(e.eingegangen))),
            ])
        })
        .collect();
    let antwort = objekt(vec![
        ("format", t("klassenraum-liste")),
        ("v", z(1)),
        ("sitzung", t(&filter)),
        ("anzahl", z(ergebnisse.len() as i64)),
        ("ergebnisse", Wert::Liste(ergebnisse)),
    ]);
    let _ = senden(strom, 200, "OK", json::schreiben(&antwort).as_bytes(), &[]);
}

/* ---------- POST /ergebnis ---------- */

fn ergebnis(strom: &mut TcpStream, anfrage: &Anfrage, lager: &Arc<Mutex<Lager>>, vorgabe: Option<&str>) {
    let typ = anfrage.kopf("content-type").unwrap_or("");
    if !typ.to_ascii_lowercase().starts_with("application/json") {
        let _ = senden(
            strom,
            415,
            "Unsupported Media Type",
            fehler_feld("Content-Type muss application/json sein", "Content-Type").as_bytes(),
            &[],
        );
        return;
    }
    let Some(text) = anfrage.rumpf_text() else {
        let _ = senden(strom, 400, "Bad Request", fehler_json("Rumpf ist kein UTF-8").as_bytes(), &[]);
        return;
    };
    let w = match json::lesen(&text) {
        Ok(w) => w,
        Err(f) => {
            let _ = senden(strom, 400, "Bad Request", fehler_json(&format!("Kein gueltiges JSON: {f}")).as_bytes(), &[]);
            return;
        }
    };
    let e = match pruefen(&w) {
        Ok(e) => e,
        Err((feld, meldung)) => {
            let _ = senden(strom, 400, "Bad Request", fehler_feld(&meldung, &feld).as_bytes(), &[]);
            return;
        }
    };
    if let Some(s) = vorgabe {
        if e.sitzung != s {
            let _ = senden(
                strom,
                409,
                "Conflict",
                fehler_feld(&format!("Dieser Server nimmt nur die Sitzung {s} an"), "sitzung").as_bytes(),
                &[],
            );
            return;
        }
    }
    let (neu, anzahl, voll) = {
        let mut l = lager.lock().unwrap();
        match l.eintragen(e.clone()) {
            Ok(neu) => (neu, l.anzahl(), l.voll()),
            Err(f) => {
                let _ = senden(strom, 507, "Insufficient Storage", fehler_json(&f).as_bytes(), &[]);
                return;
            }
        }
    };
    let antwort = objekt(vec![
        ("format", t("klassenraum-ergebnis")),
        ("v", z(1)),
        ("ok", Wert::Wahr(true)),
        ("neu", Wert::Wahr(neu)),
        ("anzahl", z(anzahl as i64)),
        ("platz", t(&e.platz)),
        ("sitzung", t(&e.sitzung)),
        ("lagerVoll", Wert::Wahr(voll)),
    ]);
    let (status, grund) = if neu { (201, "Created") } else { (200, "OK") };
    let _ = senden(strom, status, grund, json::schreiben(&antwort).as_bytes(), &[]);
}

/// Genau fuenf Felder, sonst 400. Damit kann kein Klarname und kein weiteres Feld mitgeschickt
/// werden - Datensparsamkeit wird erzwungen, nicht erbeten.
fn pruefen(w: &Wert) -> Result<Eintrag, (String, String)> {
    let Wert::Objekt(m) = w else {
        return Err(("*".into(), "Der Rumpf muss ein JSON-Objekt sein".into()));
    };
    for k in m.keys() {
        if !matches!(k.as_str(), "sitzung" | "platz" | "sterne" | "dauerS" | "code") {
            return Err((k.clone(), format!("Unbekanntes Feld '{k}' - erlaubt sind nur sitzung, platz, sterne, dauerS, code")));
        }
    }
    let hole = |name: &str| -> Result<&Wert, (String, String)> {
        m.get(name).ok_or_else(|| (name.to_string(), format!("Feld '{name}' fehlt")))
    };
    let sitzung = hole("sitzung")?.text().ok_or(("sitzung".to_string(), "Feld 'sitzung' muss Text sein".to_string()))?.to_uppercase();
    if !gueltig(&sitzung, 2, 12) {
        return Err(("sitzung".into(), "Sitzungskennung: 2 bis 12 Zeichen aus A-Z, 0-9 und '-'".into()));
    }
    let platz = hole("platz")?.text().ok_or(("platz".to_string(), "Feld 'platz' muss Text sein".to_string()))?.to_uppercase();
    if !gueltig(&platz, 1, 8) {
        return Err(("platz".into(), "Platzkennung: 1 bis 8 Zeichen aus A-Z, 0-9 und '-' - kein Name".into()));
    }
    let sterne = hole("sterne")?.ganze_zahl().ok_or(("sterne".to_string(), "Feld 'sterne' muss eine ganze Zahl sein".to_string()))?;
    if !(0..=5).contains(&sterne) {
        return Err(("sterne".into(), "Feld 'sterne' muss zwischen 0 und 5 liegen".into()));
    }
    let dauer = hole("dauerS")?.ganze_zahl().ok_or(("dauerS".to_string(), "Feld 'dauerS' muss eine ganze Zahl sein".to_string()))?;
    if !(0..=86_400).contains(&dauer) {
        return Err(("dauerS".into(), "Feld 'dauerS' muss zwischen 0 und 86400 liegen".into()));
    }
    let code = hole("code")?.text().ok_or(("code".to_string(), "Feld 'code' muss Text sein".to_string()))?.to_uppercase();
    if !gueltig(&code, 1, 64) {
        return Err(("code".into(), "Ergebnis-Code: 1 bis 64 Zeichen aus A-Z, 0-9 und '-'".into()));
    }
    Ok(Eintrag { code, sitzung, platz, sterne: sterne as u8, dauer_s: dauer as u32, eingegangen: lager::jetzt_s() })
}

/// Erlaubter Zeichensatz: `A-Z`, `a-z`, `0-9`, `-`. Leerzeichen, Umlaute und Satzzeichen fallen
/// durch - damit ist ein Klarname wie "Anna Müller" nicht abgebbar.
fn gueltig(s: &str, min: usize, max: usize) -> bool {
    let n = s.chars().count();
    n >= min && n <= max && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rumpf(json: &str) -> String {
        json.to_string()
    }

    #[test]
    fn nimmt_gueltiges_an() {
        let w = json::lesen(&rumpf(r#"{"sitzung":"nl-4f7k","platz":"p3","sterne":3,"dauerS":214,"code":"E-1"}"#)).unwrap();
        let e = pruefen(&w).unwrap();
        assert_eq!(e.sitzung, "NL-4F7K");
        assert_eq!(e.platz, "P3");
        assert_eq!(e.sterne, 3);
        assert_eq!(e.dauer_s, 214);
    }

    #[test]
    fn lehnt_klarnamen_und_fremde_felder_ab() {
        let w = json::lesen(r#"{"sitzung":"NL-4F7K","platz":"Anna Müller","sterne":3,"dauerS":214,"code":"E-1"}"#).unwrap();
        assert!(pruefen(&w).is_err());
        let w = json::lesen(r#"{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214,"code":"E-1","name":"Anna"}"#).unwrap();
        let f = pruefen(&w).unwrap_err();
        assert_eq!(f.0, "name");
    }

    #[test]
    fn lehnt_falsche_werte_ab() {
        for schlecht in [
            r#"{"platz":"P3","sterne":3,"dauerS":214,"code":"E-1"}"#,                          // sitzung fehlt
            r#"{"sitzung":"NL-4F7K","platz":"","sterne":3,"dauerS":214,"code":"E-1"}"#,         // platz leer
            r#"{"sitzung":"NL-4F7K","platz":"P3","sterne":9,"dauerS":214,"code":"E-1"}"#,       // sterne zu gross
            r#"{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":-1,"code":"E-1"}"#,        // dauer negativ
            r#"{"sitzung":"NL-4F7K","platz":"P3","sterne":3.5,"dauerS":214,"code":"E-1"}"#,     // sterne keine Ganzzahl
            r#"{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214}"#,                    // code fehlt
            r#"{"sitzung":"N L","platz":"P3","sterne":3,"dauerS":214,"code":"E-1"}"#,           // Leerzeichen
        ] {
            assert!(pruefen(&json::lesen(schlecht).unwrap()).is_err(), "haette abgelehnt werden muessen: {schlecht}");
        }
    }

    #[test]
    fn grenzen_von_sitzung_und_code() {
        // Untere und obere Grenze der Sitzungskennung (2..12) und des Codes (1..64).
        let bauen = |sitzung: &str, code: &str| {
            format!(r#"{{"sitzung":"{sitzung}","platz":"P3","sterne":3,"dauerS":214,"code":"{code}"}}"#)
        };
        assert!(pruefen(&json::lesen(&bauen("AB", "X")).unwrap()).is_ok());
        assert!(pruefen(&json::lesen(&bauen("ABCDEFGHIJKL", &"X".repeat(64))).unwrap()).is_ok());
        assert!(pruefen(&json::lesen(&bauen("A", "X")).unwrap()).is_err(), "1 Zeichen Sitzung");
        assert!(pruefen(&json::lesen(&bauen("ABCDEFGHIJKLM", "X")).unwrap()).is_err(), "13 Zeichen Sitzung");
        assert!(pruefen(&json::lesen(&bauen("AB", "")).unwrap()).is_err(), "leerer Code");
        assert!(pruefen(&json::lesen(&bauen("AB", &"X".repeat(65))).unwrap()).is_err(), "65 Zeichen Code");
        assert!(pruefen(&json::lesen(&bauen("AB", "E_1")).unwrap()).is_err(), "Unterstrich");
    }
}
