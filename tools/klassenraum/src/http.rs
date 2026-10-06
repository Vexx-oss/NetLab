//! Mini-HTTP/1.1 fuer genau zwei Pfade - nur Standardbibliothek.
//!
//! Bewusste Vereinfachung: **kein Keep-Alive**. Jede Antwort traegt `Connection: close`, jede
//! Verbindung bedient genau eine Anfrage. Das haelt Parser, Zeitlimits und Nebenlaeufigkeit
//! einfach und ist fuer einen Klassensatz Ergebniscodes (einige Dutzend Anfragen) voellig
//! ausreichend. Ebenso bewusst: keine Chunked-Uebertragung (nur `Content-Length`), keine
//! Kompression, kein TLS - der Server ist fuer das Klassenzimmer-LAN gedacht, nicht fuer das
//! Internet.

use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

/// Groesste Anfragezeile. Laenger => 431 (Zeile und Kopfzeilen teilen sich diese Antwort).
pub const MAX_ANFORDERUNGSZEILE: usize = 8 * 1024;
/// Groesste einzelne Kopfzeile. Laenger => 431.
pub const MAX_KOPFZEILE: usize = 4 * 1024;
/// Hoechstzahl Kopfzeilen. Mehr => 431.
pub const MAX_KOEPFE: usize = 40;
/// Groesster Rumpf (POST /ergebnis). Mehr => 413.
pub const MAX_RUMPF: usize = 4096;
/// So viele Bytes eines zu grossen Rumpfes werden noch wegelesen, bevor 413 kommt.
pub const DRAIN_MAX: usize = 256 * 1024;
/// Zeitlimit fuer Lesen bzw. Schreiben je Verbindung.
pub const ZEITLIMIT: Duration = Duration::from_secs(5);

#[derive(Debug)]
pub struct Anfrage {
    pub methode: String,
    pub pfad: String,
    /// Rohform der Abfrage (ohne '?'), z. B. "sitzung=NL-4F7K"
    pub abfrage: String,
    pub koepfe: Vec<(String, String)>,
    pub rumpf: Vec<u8>,
}

impl Anfrage {
    pub fn kopf(&self, name: &str) -> Option<&str> {
        self.koepfe
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case(name))
            .map(|(_, v)| v.as_str())
    }

    pub fn rumpf_text(&self) -> Option<String> {
        String::from_utf8(self.rumpf.clone()).ok()
    }

    /// Wert eines Abfrageparameters, prozentdekodiert (nur die noetigen Faelle).
    pub fn frage_wert(&self, name: &str) -> Option<String> {
        for teil in self.abfrage.split('&') {
            let (k, v) = match teil.split_once('=') {
                Some((k, v)) => (k, v),
                None => (teil, ""),
            };
            if k == name {
                return Some(prozent_dekodieren(v));
            }
        }
        None
    }
}

fn prozent_dekodieren(s: &str) -> String {
    let b = s.as_bytes();
    let mut aus = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        match b[i] {
            b'%' if i + 2 < b.len() => {
                let hex = std::str::from_utf8(&b[i + 1..i + 3]).unwrap_or("");
                match u8::from_str_radix(hex, 16) {
                    Ok(n) => {
                        aus.push(n);
                        i += 3;
                    }
                    Err(_) => {
                        aus.push(b[i]);
                        i += 1;
                    }
                }
            }
            b'+' => {
                aus.push(b' ');
                i += 1;
            }
            c => {
                aus.push(c);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&aus).into_owned()
}

/// Fehler beim Lesen einer Anfrage. `status` ist der HTTP-Status, der geantwortet werden soll.
#[derive(Debug)]
pub struct Lesefehler {
    pub status: u16,
    pub grund: &'static str,
    pub text: String,
}

fn fehler(status: u16, grund: &'static str, text: impl Into<String>) -> Lesefehler {
    Lesefehler { status, grund, text: text.into() }
}

/// Eine Zeile bis '\n' lesen - byteweise, begrenzt, direkt vom Socket.
///
/// Warum byteweise und ohne Puffer: Der Socket muss zwischen Kopfzeilen und Rumpf **beschrieben**
/// werden koennen (Zwischenantwort "100 Continue"). Mit einem `BufReader` ueber `&TcpStream` waere
/// das ein Borrow-Konflikt, und ein zweites Socket-Handle (`try_clone`) ist hier falsch: Gemessen
/// am 06.10.2026 brach die Verbindung nach dem Schreiben ueber das Duplikat ab (ECONNRESET beim
/// Client), obwohl die Zwischenantwort ankam. Bei hoechstens 12 KiB je Anfrage sind die
/// zusaetzlichen Systemaufrufe belanglos.
fn zeile(strom: &mut TcpStream, max: usize) -> Result<Option<String>, Lesefehler> {
    let mut buf: Vec<u8> = Vec::new();
    let mut b = [0u8; 1];
    loop {
        match strom.read(&mut b) {
            Ok(0) => {
                return if buf.is_empty() { Ok(None) } else { Ok(Some(fertig(buf))) };
            }
            Ok(_) => {
                if b[0] == b'\n' {
                    return Ok(Some(fertig(buf)));
                }
                buf.push(b[0]);
                if buf.len() > max {
                    return Err(fehler(431, "Request Header Fields Too Large", format!("Zeile laenger als {max} Bytes")));
                }
            }
            Err(e) => return Err(fehler(408, "Request Timeout", format!("Lesefehler oder Zeitlimit: {e}"))),
        }
    }
}

fn fertig(mut buf: Vec<u8>) -> String {
    if buf.last() == Some(&b'\r') {
        buf.pop();
    }
    String::from_utf8_lossy(&buf).into_owned()
}

/// Anfrage lesen. `Ok(None)` heisst: Verbindung wurde ohne Daten geschlossen (kein Fehler).
pub fn lesen(strom: &mut TcpStream) -> Result<Option<Anfrage>, Lesefehler> {
    /* WICHTIG (gemessen am 06.10.2026): Auf Windows erbt ein von `accept()` gelieferter Socket den
       Nicht-Blockier-Modus des Horchers. Der Horcher steht hier auf nonblocking (damit die
       Annahmeschleife das Abbruchflag sehen kann), also muss jede Verbindung ausdruecklich wieder
       auf blockierend gestellt werden - sonst scheitert jedes Lesen, dessen Bytes noch nicht
       eingetroffen sind, mit WSAEWOULDBLOCK (os error 10035). Genau das passierte beim Rumpf
       hinter einer "100 Continue"-Zwischenantwort. */
    let _ = strom.set_nonblocking(false);
    let _ = strom.set_read_timeout(Some(ZEITLIMIT));
    let _ = strom.set_write_timeout(Some(ZEITLIMIT));
    let _ = strom.set_nodelay(true);

    let Some(kopfzeile) = zeile(strom, MAX_ANFORDERUNGSZEILE)? else {
        return Ok(None);
    };
    if kopfzeile.is_empty() {
        return Ok(None);
    }
    let teile: Vec<&str> = kopfzeile.split(' ').collect();
    if teile.len() != 3 || !teile[2].starts_with("HTTP/1.") {
        return Err(fehler(400, "Bad Request", format!("Keine gueltige Anfragezeile: {kopfzeile}")));
    }
    let methode = teile[0].to_ascii_uppercase();
    if methode.len() > 16 || !methode.bytes().all(|b| b.is_ascii_alphabetic()) {
        return Err(fehler(400, "Bad Request", "Ungueltige Methode"));
    }
    let (pfad, abfrage) = match teile[1].split_once('?') {
        Some((p, a)) => (p.to_string(), a.to_string()),
        None => (teile[1].to_string(), String::new()),
    };

    let mut koepfe: Vec<(String, String)> = Vec::new();
    loop {
        let Some(z) = zeile(strom, MAX_KOPFZEILE)? else {
            return Err(fehler(400, "Bad Request", "Kopfzeilen brechen ab"));
        };
        if z.is_empty() {
            break;
        }
        if koepfe.len() >= MAX_KOEPFE {
            return Err(fehler(431, "Request Header Fields Too Large", format!("Mehr als {MAX_KOEPFE} Kopfzeilen")));
        }
        let Some((k, v)) = z.split_once(':') else {
            return Err(fehler(400, "Bad Request", format!("Kopfzeile ohne Doppelpunkt: {z}")));
        };
        koepfe.push((k.trim().to_string(), v.trim().to_string()));
    }

    let laenge: usize = match koepfe.iter().find(|(k, _)| k.eq_ignore_ascii_case("content-length")) {
        Some((_, v)) => v.parse().map_err(|_| fehler(400, "Bad Request", format!("Content-Length ist keine Zahl: {v}")))?,
        None => 0,
    };
    if laenge > MAX_RUMPF {
        /* Erst den Rumpf weglesen (bis zu einer Grenze), dann antworten. Sonst schickt der Client
           weiter, waehrend der Server schon schliesst - die Antwort geht verloren und der Client
           meldet nur "Verbindung abgebrochen" statt 413 (gemessen am 06.10.2026 mit curl).
           Bei wirklich grossen Rumpfen wird nach DRAIN_MAX abgebrochen; das ist die ehrliche
           Grenze und steht in LIESMICH.md. */
        let mut muell = [0u8; 8192];
        let mut rest = laenge.min(DRAIN_MAX);
        while rest > 0 {
            let stueck = rest.min(muell.len());
            match strom.read(&mut muell[..stueck]) {
                Ok(0) => break,
                Ok(n) => rest -= n,
                Err(_) => break,
            }
        }
        return Err(fehler(413, "Payload Too Large", format!("Rumpf {laenge} Bytes, erlaubt sind {MAX_RUMPF}")));
    }
    let mut rumpf = vec![0u8; laenge];
    if laenge > 0 {
        /* "Expect: 100-continue": Der Client haelt den Rumpf zurueck, bis er die Zwischenantwort
           gesehen hat. Antwortet der Server nicht, wartet der Client (gemessen: Windows
           PowerShell 5.1 mit Invoke-WebRequest) bis zu seinem eigenen Zeitlimit - der Server
           laeuft indessen in sein Leselimit und antwortet 400. Deshalb hier korrekt
           "HTTP/1.1 100 Continue" senden, bevor der Rumpf gelesen wird. */
        let will_100 = koepfe
            .iter()
            .any(|(k, v)| k.eq_ignore_ascii_case("expect") && v.to_ascii_lowercase().contains("100-continue"));
        if will_100 {
            strom
                .write_all(b"HTTP/1.1 100 Continue\r\n\r\n")
                .and_then(|_| strom.flush())
                .map_err(|e| fehler(400, "Bad Request", format!("Zwischenantwort nicht sendbar: {e}")))?;
        }
        strom.read_exact(&mut rumpf).map_err(|e| fehler(400, "Bad Request", format!("Rumpf unvollstaendig: {e}")))?;
    }

    Ok(Some(Anfrage { methode, pfad, abfrage, koepfe, rumpf }))
}

/// Antwort schreiben. `cors` = die CORS-Kopfzeilen anhaengen (fuer Browser-Fassungen noetig).
pub fn antworten(
    strom: &mut TcpStream,
    status: u16,
    grund: &str,
    typ: &str,
    rumpf: &[u8],
    cors: bool,
    extra: &[(&str, &str)],
) -> std::io::Result<()> {
    let mut kopf = String::new();
    kopf.push_str(&format!("HTTP/1.1 {status} {grund}\r\n"));
    kopf.push_str(&format!("Content-Type: {typ}\r\n"));
    kopf.push_str(&format!("Content-Length: {}\r\n", rumpf.len()));
    kopf.push_str("Cache-Control: no-store\r\n");
    kopf.push_str("Connection: close\r\n");
    if cors {
        // Kein Access-Control-Allow-Credentials: mit "*" waere das unzulaessig, und der Server
        // braucht keine Kekse (Datensparsamkeit).
        kopf.push_str("Access-Control-Allow-Origin: *\r\n");
        kopf.push_str("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
        kopf.push_str("Access-Control-Allow-Headers: Content-Type\r\n");
        kopf.push_str("Access-Control-Max-Age: 600\r\n");
        // Chrome/Edge: Anfragen aus dem oeffentlichen Netz (GitHub Pages) an eine lokale Adresse
        // brauchen diese Zeile im Preflight (Private Network Access).
        kopf.push_str("Access-Control-Allow-Private-Network: true\r\n");
    }
    for (k, v) in extra {
        kopf.push_str(&format!("{k}: {v}\r\n"));
    }
    kopf.push_str("\r\n");
    strom.write_all(kopf.as_bytes())?;
    strom.write_all(rumpf)?;
    strom.flush()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prozent() {
        assert_eq!(prozent_dekodieren("NL-4F7K"), "NL-4F7K");
        assert_eq!(prozent_dekodieren("a%20b+c"), "a b c");
        assert_eq!(prozent_dekodieren("%C3%A4"), "ä");
        assert_eq!(prozent_dekodieren("%zz"), "%zz");
    }

    #[test]
    fn abfrage() {
        let a = Anfrage {
            methode: "GET".into(),
            pfad: "/liste".into(),
            abfrage: "sitzung=NL-4F7K&x=1".into(),
            koepfe: vec![],
            rumpf: vec![],
        };
        assert_eq!(a.frage_wert("sitzung").as_deref(), Some("NL-4F7K"));
        assert_eq!(a.frage_wert("x").as_deref(), Some("1"));
        assert_eq!(a.frage_wert("y"), None);
    }
}
