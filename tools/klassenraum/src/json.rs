//! Winziger JSON-Leser und -Schreiber, nur Standardbibliothek.
//!
//! Warum von Hand: Die Umgebung hat keinen Zugang zu crates.io (`cargo fetch` scheitert an
//! SSL/schannel, siehe LIESMICH.md). Ein Server, der zwei kleine, feste Datenformen liest und
//! schreibt, braucht dafuer keine fremde Kiste.
//!
//! Bewusste Grenzen: Zahlen werden als f64 gehalten (Ganzzahlen werden geprueft), Objekte sind
//! eine sortierte Map (Reihenfolge der Felder ist fuer JSON ohne Bedeutung), Tiefe ist nicht
//! gesondert begrenzt (der Rumpf ist auf 4096 Bytes begrenzt, damit auch die Verschachtelung).

use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq)]
pub enum Wert {
    Null,
    Wahr(bool),
    Zahl(f64),
    Text(String),
    Liste(Vec<Wert>),
    Objekt(BTreeMap<String, Wert>),
}

impl Wert {
    pub fn text(&self) -> Option<&str> {
        match self {
            Wert::Text(t) => Some(t),
            _ => None,
        }
    }

    /// Ganzzahl, oder None wenn es keine ganze Zahl ist (z. B. 3.5, "3", true).
    pub fn ganze_zahl(&self) -> Option<i64> {
        match self {
            Wert::Zahl(z) if z.is_finite() && z.fract() == 0.0 => Some(*z as i64),
            _ => None,
        }
    }

    pub fn feld(&self, name: &str) -> Option<&Wert> {
        match self {
            Wert::Objekt(m) => m.get(name),
            _ => None,
        }
    }
}

/* ---------- schreiben ---------- */

pub fn schreiben(w: &Wert) -> String {
    let mut s = String::new();
    schreib(w, &mut s);
    s
}

fn schreib(w: &Wert, s: &mut String) {
    match w {
        Wert::Null => s.push_str("null"),
        Wert::Wahr(b) => s.push_str(if *b { "true" } else { "false" }),
        Wert::Zahl(z) => {
            if z.is_finite() && z.fract() == 0.0 && z.abs() < 9.0e15 {
                s.push_str(&format!("{}", *z as i64));
            } else if z.is_finite() {
                s.push_str(&format!("{z}"));
            } else {
                s.push_str("null");
            }
        }
        Wert::Text(t) => text(t, s),
        Wert::Liste(l) => {
            s.push('[');
            for (i, e) in l.iter().enumerate() {
                if i > 0 {
                    s.push(',');
                }
                schreib(e, s);
            }
            s.push(']');
        }
        Wert::Objekt(m) => {
            s.push('{');
            for (i, (k, v)) in m.iter().enumerate() {
                if i > 0 {
                    s.push(',');
                }
                text(k, s);
                s.push(':');
                schreib(v, s);
            }
            s.push('}');
        }
    }
}

fn text(t: &str, s: &mut String) {
    s.push('"');
    for c in t.chars() {
        match c {
            '"' => s.push_str("\\\""),
            '\\' => s.push_str("\\\\"),
            '\n' => s.push_str("\\n"),
            '\r' => s.push_str("\\r"),
            '\t' => s.push_str("\\t"),
            c if (c as u32) < 0x20 => s.push_str(&format!("\\u{:04x}", c as u32)),
            c => s.push(c),
        }
    }
    s.push('"');
}

/* ---------- lesen ---------- */

pub fn lesen(text: &str) -> Result<Wert, String> {
    /* Ein fuehrendes BOM wird geduldet: Windows PowerShell 5.1 schreibt Dateien mit
       "Set-Content -Encoding utf8" mit BOM, und ein per Datei abgeschickter Rumpf soll daran
       nicht scheitern. (RFC 8259 erlaubt das Ignorieren ausdruecklich.) */
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let mut p = Parser { z: text.as_bytes(), i: 0 };
    p.leerraum();
    let w = p.wert()?;
    p.leerraum();
    if p.i != p.z.len() {
        return Err(format!("Unerwartetes Zeichen an Stelle {}", p.i + 1));
    }
    Ok(w)
}

struct Parser<'a> {
    z: &'a [u8],
    i: usize,
}

impl<'a> Parser<'a> {
    fn leerraum(&mut self) {
        while self.i < self.z.len() && matches!(self.z[self.i], b' ' | b'\t' | b'\n' | b'\r') {
            self.i += 1;
        }
    }

    fn wert(&mut self) -> Result<Wert, String> {
        let Some(&c) = self.z.get(self.i) else {
            return Err("Unerwartetes Ende".into());
        };
        match c {
            b'{' => self.objekt(),
            b'[' => self.liste(),
            b'"' => Ok(Wert::Text(self.zeichenkette()?)),
            b't' => self.wort("true", Wert::Wahr(true)),
            b'f' => self.wort("false", Wert::Wahr(false)),
            b'n' => self.wort("null", Wert::Null),
            b'-' | b'0'..=b'9' => self.zahl(),
            _ => Err(format!("Unerwartetes Zeichen '{}' an Stelle {}", c as char, self.i + 1)),
        }
    }

    fn wort(&mut self, w: &str, ergebnis: Wert) -> Result<Wert, String> {
        if self.z[self.i..].starts_with(w.as_bytes()) {
            self.i += w.len();
            Ok(ergebnis)
        } else {
            Err(format!("Erwartet wurde {w} an Stelle {}", self.i + 1))
        }
    }

    fn objekt(&mut self) -> Result<Wert, String> {
        self.i += 1; // {
        let mut m = BTreeMap::new();
        self.leerraum();
        if self.z.get(self.i) == Some(&b'}') {
            self.i += 1;
            return Ok(Wert::Objekt(m));
        }
        loop {
            self.leerraum();
            let k = self.zeichenkette()?;
            self.leerraum();
            if self.z.get(self.i) != Some(&b':') {
                return Err(format!("':' fehlt an Stelle {}", self.i + 1));
            }
            self.i += 1;
            self.leerraum();
            let v = self.wert()?;
            m.insert(k, v);
            self.leerraum();
            match self.z.get(self.i) {
                Some(&b',') => {
                    self.i += 1;
                }
                Some(&b'}') => {
                    self.i += 1;
                    return Ok(Wert::Objekt(m));
                }
                _ => return Err(format!("',' oder '}}' erwartet an Stelle {}", self.i + 1)),
            }
        }
    }

    fn liste(&mut self) -> Result<Wert, String> {
        self.i += 1; // [
        let mut l = Vec::new();
        self.leerraum();
        if self.z.get(self.i) == Some(&b']') {
            self.i += 1;
            return Ok(Wert::Liste(l));
        }
        loop {
            self.leerraum();
            l.push(self.wert()?);
            self.leerraum();
            match self.z.get(self.i) {
                Some(&b',') => {
                    self.i += 1;
                }
                Some(&b']') => {
                    self.i += 1;
                    return Ok(Wert::Liste(l));
                }
                _ => return Err(format!("',' oder ']' erwartet an Stelle {}", self.i + 1)),
            }
        }
    }

    fn zeichenkette(&mut self) -> Result<String, String> {
        if self.z.get(self.i) != Some(&b'"') {
            return Err(format!("Zeichenkette erwartet an Stelle {}", self.i + 1));
        }
        self.i += 1;
        let mut s = String::new();
        loop {
            let Some(&c) = self.z.get(self.i) else {
                return Err("Zeichenkette bricht ab".into());
            };
            self.i += 1;
            match c {
                b'"' => return Ok(s),
                b'\\' => {
                    let Some(&e) = self.z.get(self.i) else {
                        return Err("Fluchtzeichen bricht ab".into());
                    };
                    self.i += 1;
                    match e {
                        b'"' => s.push('"'),
                        b'\\' => s.push('\\'),
                        b'/' => s.push('/'),
                        b'b' => s.push('\u{8}'),
                        b'f' => s.push('\u{c}'),
                        b'n' => s.push('\n'),
                        b'r' => s.push('\r'),
                        b't' => s.push('\t'),
                        b'u' => {
                            let hex = self
                                .z
                                .get(self.i..self.i + 4)
                                .ok_or("\\u braucht vier Hexziffern")?;
                            let t = std::str::from_utf8(hex).map_err(|_| "\\u ist kein UTF-8")?;
                            let n = u32::from_str_radix(t, 16).map_err(|_| "\\u ist keine Hexzahl")?;
                            self.i += 4;
                            // Ersatzpaare (Surrogate) werden bewusst nicht zusammengesetzt: Die
                            // erlaubten Werte dieses Servers sind ASCII (Platzkennungen, Codes).
                            if (0xD800..0xE000).contains(&n) {
                                return Err("Ersatzpaare sind hier nicht erlaubt".into());
                            }
                            s.push(char::from_u32(n).ok_or("Ungueltiges \\u-Zeichen")?);
                        }
                        _ => return Err(format!("Unbekanntes Fluchtzeichen \\{}", e as char)),
                    }
                }
                c if c < 0x20 => return Err("Steuerzeichen in der Zeichenkette".into()),
                c => {
                    // UTF-8 durchreichen: das Byte gehoert zu einer Mehrbyte-Folge
                    let start = self.i - 1;
                    let breit = match c {
                        0x00..=0x7F => 1,
                        0xC0..=0xDF => 2,
                        0xE0..=0xEF => 3,
                        0xF0..=0xF7 => 4,
                        _ => return Err("Ungueltige UTF-8-Folge".into()),
                    };
                    if self.i - 1 + breit > self.z.len() {
                        return Err("UTF-8-Folge bricht ab".into());
                    }
                    let stueck = &self.z[start..start + breit];
                    let t = std::str::from_utf8(stueck).map_err(|_| "Ungueltiges UTF-8")?;
                    s.push_str(t);
                    self.i = start + breit;
                }
            }
        }
    }

    fn zahl(&mut self) -> Result<Wert, String> {
        let start = self.i;
        if self.z.get(self.i) == Some(&b'-') {
            self.i += 1;
        }
        while matches!(self.z.get(self.i), Some(b'0'..=b'9') | Some(b'.') | Some(b'e') | Some(b'E') | Some(b'+') | Some(b'-')) {
            self.i += 1;
        }
        let t = std::str::from_utf8(&self.z[start..self.i]).map_err(|_| "Zahl ist kein UTF-8")?;
        t.parse::<f64>().map(Wert::Zahl).map_err(|_| format!("Keine Zahl: {t}"))
    }
}

/* ---------- Bequemlichkeit ---------- */

/// Objekt aus Schluessel/Wert-Paaren bauen (Reihenfolge egal, Ausgabe ist sortiert).
pub fn objekt(paare: Vec<(&str, Wert)>) -> Wert {
    let mut m = BTreeMap::new();
    for (k, v) in paare {
        m.insert(k.to_string(), v);
    }
    Wert::Objekt(m)
}

pub fn t(s: &str) -> Wert {
    Wert::Text(s.to_string())
}

pub fn z(n: i64) -> Wert {
    Wert::Zahl(n as f64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn liest_und_schreibt() {
        let w = lesen(r#"{"a":1,"b":"x\u00e4","c":[true,null,-2.5]}"#).unwrap();
        assert_eq!(w.feld("a").unwrap().ganze_zahl(), Some(1));
        assert_eq!(w.feld("b").unwrap().text(), Some("x\u{e4}"));
        assert_eq!(w.feld("c").unwrap(), &Wert::Liste(vec![Wert::Wahr(true), Wert::Null, Wert::Zahl(-2.5)]));
        let s = schreiben(&w);
        assert_eq!(lesen(&s).unwrap(), w);
    }

    #[test]
    fn lehnt_muell_ab() {
        assert!(lesen("{").is_err());
        assert!(lesen("{\"a\":}").is_err());
        assert!(lesen("[1,]").is_err());
        assert!(lesen("1 2").is_err());
        // Ein Ersatzpaar (Surrogat) wird abgelehnt - erlaubt sind hier nur ASCII-Werte.
        assert!(lesen(r#""\ud83d\ude00""#).is_err());
    }
}
