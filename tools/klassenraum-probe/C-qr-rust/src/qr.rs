//! QR-Code Model 2 (ISO/IEC 18004) - abhaengigkeitsfrei, nur Standardbibliothek.
//!
//! Warum von Hand: Die Kiste `qrcode` liegt nicht im Cache und crates.io ist nicht erreichbar
//! (`cargo fetch` scheitert an SSL/schannel, gemessen am 06.10.2026). Stufe D des Auftrags
//! KLASSENRAUM.md verlangt einen QR-Code des Auftragscodes in der Desktop-Fassung - also
//! entsteht der Encoder hier ohne fremde Kiste. Umfang bewusst klein: Versionen 1 bis 4,
//! Stufen L/M/Q/H, Modi alphanumerisch und Byte, Masken 0-7 mit Maskenwahl nach den vier
//! Strafregeln der Norm. Hoehere Versionen brauchen die Versionsinformation (BCH(18,6)) und
//! weitere Blockgruppen - fuer einen Auftragscode von 10 Zeichen ist das nicht noetig.
//!
//! Gegenprobe: `tools/klassenraum-probe/C-qr-python/qr_referenz.py` ist eine unabhaengig
//! geschriebene Python-Referenz; beide muessen dieselbe Matrix liefern (Differentialtest).

/// Fehlerkorrekturstufe.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Ecc {
    L,
    M,
    Q,
    H,
}

impl Ecc {
    pub fn name(self) -> &'static str {
        match self {
            Ecc::L => "L",
            Ecc::M => "M",
            Ecc::Q => "Q",
            Ecc::H => "H",
        }
    }
    /// Die zwei Formatbits der Stufe (nicht die Zahlenfolge der Norm, sondern die Bitbelegung).
    fn bits(self) -> u16 {
        match self {
            Ecc::L => 0b01,
            Ecc::M => 0b00,
            Ecc::Q => 0b11,
            Ecc::H => 0b10,
        }
    }
    pub fn aus_text(s: &str) -> Option<Ecc> {
        match s.to_ascii_uppercase().as_str() {
            "L" => Some(Ecc::L),
            "M" => Some(Ecc::M),
            "Q" => Some(Ecc::Q),
            "H" => Some(Ecc::H),
            _ => None,
        }
    }
}

/// Zeichenvorrat des alphanumerischen Modus (Wert = Stelle in dieser Tabelle).
const ALNUM: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/// Je Version 1..4 und Stufe L/M/Q/H: (Daten-Codewoerter gesamt, EC-Codewoerter je Block, Blockzahl).
/// Quelle: ISO/IEC 18004, Tabelle der Blockstruktur (V1 26, V2 44, V3 70, V4 100 Codewoerter gesamt).
const STUFEN: [[(u16, u8, u8); 4]; 4] = [
    [(19, 7, 1), (16, 10, 1), (13, 13, 1), (9, 17, 1)],
    [(34, 10, 1), (28, 16, 1), (22, 22, 1), (16, 28, 1)],
    [(55, 15, 1), (44, 26, 1), (34, 18, 2), (26, 22, 2)],
    [(80, 20, 1), (64, 18, 2), (48, 26, 2), (36, 16, 4)],
];

/// Mittelpunkte der Ausrichtungsmuster je Version (V1 hat keine).
const AUSRICHTUNG: [&[usize]; 4] = [&[], &[6, 18], &[6, 22], &[6, 26]];

/// Restbits am Ende der Datencodewoerter (V1: 0, V2-V6: 7).
fn restbits(version: u8) -> usize {
    if version == 1 {
        0
    } else {
        7
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Modus {
    Alphanumerisch,
    Byte,
}

impl Modus {
    fn kennung(self) -> u8 {
        match self {
            Modus::Alphanumerisch => 0b0010,
            Modus::Byte => 0b0100,
        }
    }
    fn zeichenbits(self) -> usize {
        match self {
            Modus::Alphanumerisch => 9,
            Modus::Byte => 8,
        }
    }
}

pub fn modus_waehlen(text: &str) -> Modus {
    if !text.is_empty() && text.bytes().all(|b| ALNUM.contains(&b)) {
        Modus::Alphanumerisch
    } else {
        Modus::Byte
    }
}

#[derive(Clone, Debug)]
pub struct Qr {
    pub text: String,
    pub version: u8,
    pub ecc: Ecc,
    pub modus: Modus,
    pub maske: u8,
    pub automatisch: bool,
    /// `true` = dunkel
    pub matrix: Vec<Vec<bool>>,
}

impl Qr {
    pub fn groesse(&self) -> usize {
        self.matrix.len()
    }
    /// Zeilen aus "0" (hell) und "1" (dunkel) - dieselbe Form wie in der Python-Referenz.
    pub fn zeilen(&self) -> Vec<String> {
        self.matrix
            .iter()
            .map(|z| z.iter().map(|d| if *d { '1' } else { '0' }).collect())
            .collect()
    }
}

/* ---------- Bitstrom ---------- */

#[derive(Default)]
struct Bits {
    b: Vec<bool>,
}

impl Bits {
    fn schiebe(&mut self, wert: u32, anzahl: usize) {
        for i in (0..anzahl).rev() {
            self.b.push((wert >> i) & 1 == 1);
        }
    }
    fn laenge(&self) -> usize {
        self.b.len()
    }
}

/// Nutzdaten als Bitstrom (Moduskennung, Laenge, Daten).
fn nutzbits(text: &str, modus: Modus) -> Result<Bits, String> {
    let mut bits = Bits::default();
    bits.schiebe(modus.kennung() as u32, 4);
    match modus {
        Modus::Alphanumerisch => {
            let z: Vec<u8> = text
                .bytes()
                .map(|b| ALNUM.iter().position(|x| *x == b).map(|p| p as u8).ok_or_else(|| format!("Zeichen nicht im alphanumerischen Vorrat: {}", b as char)))
                .collect::<Result<_, _>>()?;
            bits.schiebe(z.len() as u32, modus.zeichenbits());
            let mut i = 0;
            while i + 1 < z.len() {
                bits.schiebe((z[i] as u32) * 45 + z[i + 1] as u32, 11);
                i += 2;
            }
            if i < z.len() {
                bits.schiebe(z[i] as u32, 6);
            }
        }
        Modus::Byte => {
            let bytes = text.as_bytes();
            bits.schiebe(bytes.len() as u32, modus.zeichenbits());
            for b in bytes {
                bits.schiebe(*b as u32, 8);
            }
        }
    }
    Ok(bits)
}

/// Nutzbits + Abschluss + Fuellbytes zu den Datencodewoertern der Version machen.
fn datencodewoerter(text: &str, version: u8, stufe: Ecc) -> Result<Vec<u8>, String> {
    let modus = modus_waehlen(text);
    let nutz = nutzbits(text, modus)?;
    let (daten_cw, _, _) = STUFEN[(version - 1) as usize][stufe_index(stufe)];
    let kapazitaet = daten_cw as usize * 8;
    if nutz.laenge() > kapazitaet {
        return Err(format!(
            "Text zu lang: {} Nutzbits benoetigt, {kapazitaet} Bit verfuegbar (Version {version}, Stufe {}).",
            nutz.laenge(),
            stufe.name()
        ));
    }
    let mut bits = nutz.b;
    // Abschluss: bis zu vier Nullen, dann auf Bytegrenze auffuellen
    let rest = kapazitaet - bits.len();
    for _ in 0..rest.min(4) {
        bits.push(false);
    }
    while bits.len() % 8 != 0 {
        bits.push(false);
    }
    let mut cw: Vec<u8> = bits.chunks(8).map(|c| c.iter().fold(0u8, |a, b| (a << 1) | (*b as u8))).collect();
    // Fuellbytes 0xEC / 0x11 im Wechsel
    let mut fuell = 0xEC;
    while cw.len() < daten_cw as usize {
        cw.push(fuell);
        fuell = if fuell == 0xEC { 0x11 } else { 0xEC };
    }
    Ok(cw)
}

fn stufe_index(e: Ecc) -> usize {
    match e {
        Ecc::L => 0,
        Ecc::M => 1,
        Ecc::Q => 2,
        Ecc::H => 3,
    }
}

/* ---------- Reed-Solomon ueber GF(256), Primitive 0x11D ---------- */

struct Gf {
    exp: [u8; 512],
    log: [u8; 256],
}

impl Gf {
    fn neu() -> Gf {
        let mut exp = [0u8; 512];
        let mut log = [0u8; 256];
        let mut x: u16 = 1;
        for i in 0..255 {
            exp[i] = x as u8;
            log[x as usize] = i as u8;
            x <<= 1;
            if x & 0x100 != 0 {
                x ^= 0x11D;
            }
        }
        for i in 255..512 {
            exp[i] = exp[i - 255];
        }
        Gf { exp, log }
    }
    fn mal(&self, a: u8, b: u8) -> u8 {
        if a == 0 || b == 0 {
            0
        } else {
            self.exp[self.log[a as usize] as usize + self.log[b as usize] as usize]
        }
    }
}

/// Generatorpolynom (x - a^0)(x - a^1)...(x - a^(grad-1)), Koeffizienten hoechste Potenz zuerst.
fn generator(gf: &Gf, grad: usize) -> Vec<u8> {
    let mut g = vec![1u8];
    for i in 0..grad {
        let mut neu = vec![0u8; g.len() + 1];
        for (j, k) in g.iter().enumerate() {
            neu[j] ^= gf.mal(*k, 1);
            neu[j + 1] ^= gf.mal(*k, gf.exp[i]);
        }
        g = neu;
    }
    g
}

/// Fehlerkorrektur-Codewoerter zu einem Datenblock (Polynomdivision im Galois-Koerper).
fn ec_codewoerter(gf: &Gf, daten: &[u8], grad: usize) -> Vec<u8> {
    let g = generator(gf, grad);
    let mut rest = vec![0u8; grad];
    for d in daten {
        let faktor = d ^ rest[0];
        // Register um eine Stelle nach links schieben und hinten eine Null nachziehen.
        // (Die erste Fassung nutzte rotate_left + push: das Register wuchs bei jedem Byte
        // und lieferte falsche Pruefbytes - vom Differentialtest gegen die Python-Referenz
        // gefunden, die Nutzlast stimmte, die Reed-Solomon-Syndrome nicht.)
        rest.copy_within(1.., 0);
        rest[grad - 1] = 0;
        for i in 0..grad {
            rest[i] ^= gf.mal(g[i + 1], faktor);
        }
    }
    rest
}

/* ---------- Matrix ---------- */

struct Bau {
    groesse: usize,
    dunkel: Vec<Vec<bool>>,
    reserviert: Vec<Vec<bool>>,
}

impl Bau {
    fn neu(groesse: usize) -> Bau {
        Bau { groesse, dunkel: vec![vec![false; groesse]; groesse], reserviert: vec![vec![false; groesse]; groesse] }
    }
    fn setze(&mut self, z: usize, s: usize, wert: bool) {
        self.dunkel[z][s] = wert;
        self.reserviert[z][s] = true;
    }
    /// Suchermuster samt Trenner. `(z0, s0)` ist die linke obere Ecke des **8x8**-Feldes.
    /// Das 7x7-Muster liegt darin je nach Ecke an einer anderen Stelle, der Rest ist Trenner
    /// (hell): oben links oben-links, oben rechts **rechts**, unten links **unten**.
    /// Genau diese Verschiebung war am 06.10.2026 der zweite gefundene Fehler - das obere rechte
    /// Muster sass eine Spalte zu weit links.
    fn sucher(&mut self, z0: usize, s0: usize, muster_rechts: bool, muster_unten: bool) {
        let (dz0, ds0) = (usize::from(muster_unten), usize::from(muster_rechts));
        for dz in 0..8 {
            for ds in 0..8 {
                let im_muster = dz >= dz0 && dz < dz0 + 7 && ds >= ds0 && ds < ds0 + 7;
                let wert = if im_muster {
                    let (mz, ms) = (dz - dz0, ds - ds0);
                    let rand = mz == 0 || mz == 6 || ms == 0 || ms == 6;
                    let kern = (2..=4).contains(&mz) && (2..=4).contains(&ms);
                    rand || kern
                } else {
                    false
                };
                if z0 + dz < self.groesse && s0 + ds < self.groesse {
                    self.setze(z0 + dz, s0 + ds, wert);
                }
            }
        }
    }
    fn takt(&mut self) {
        for i in 8..self.groesse - 8 {
            let wert = i % 2 == 0;
            self.setze(6, i, wert);
            self.setze(i, 6, wert);
        }
    }
    fn ausrichtung(&mut self, z0: usize, s0: usize) {
        for dz in 0..5 {
            for ds in 0..5 {
                let rand = dz == 0 || dz == 4 || ds == 0 || ds == 4;
                let mitte = dz == 2 && ds == 2;
                self.setze(z0 + dz - 2, s0 + ds - 2, rand || mitte);
            }
        }
    }
    /// Die 15+15 Zellen der Formatinformation reservieren (sie werden spaeter gefuellt).
    /// Kopie 1: Spalte 8 (Zeilen 0-8) und Zeile 8 (Spalten 0-8), jeweils ohne Taktlinie 6.
    /// Kopie 2: Zeile 8 (Spalten g-8..g-1) und Spalte 8 (Zeilen g-7..g-1), dazu das Dunkelmodul.
    fn format_reservieren(&mut self) {
        let g = self.groesse;
        for s in 0..=8 {
            if s != 6 {
                self.reserviert[8][s] = true;
            }
        }
        for z in 0..=8 {
            if z != 6 {
                self.reserviert[z][8] = true;
            }
        }
        for z in (g - 7)..g {
            self.reserviert[z][8] = true;
        }
        for s in (g - 8)..g {
            self.reserviert[8][s] = true;
        }
        self.reserviert[g - 8][8] = true; // Dunkelmodul
    }
}

/// Formatinformation: 5 Nutzbits, BCH(15,5) mit Generator 0x537, XOR mit 0x5412.
fn format_info(stufe: Ecc, maske: u8) -> u16 {
    let daten: u16 = ((stufe.bits() as u16) << 3) | maske as u16;
    let mut rest: u16 = daten << 10;
    for i in (10..15).rev() {
        if rest & (1 << i) != 0 {
            rest ^= 0x537 << (i - 10);
        }
    }
    ((daten << 10) | rest) ^ 0x5412
}

fn format_setzen(b: &mut Bau, stufe: Ecc, maske: u8) {
    let f = format_info(stufe, maske);
    let g = b.groesse;
    let bit = |i: u32| (f >> i) & 1 == 1;
    // Kopie 1: Spalte 8 aufwaerts, dann Zeile 8 nach links. Achtung: [Zeile][Spalte] - die
    // erste Fassung hatte Zeile und Spalte vertauscht (vom Differentialtest gefunden).
    for i in 0..6u32 {
        b.dunkel[i as usize][8] = bit(i);
    }
    b.dunkel[7][8] = bit(6);
    b.dunkel[8][8] = bit(7);
    b.dunkel[8][7] = bit(8);
    for i in 9..15u32 {
        b.dunkel[8][(14 - i) as usize] = bit(i);
    }
    // Kopie 2: Zeile 8 von rechts, dann Spalte 8 nach unten.
    for i in 0..8u32 {
        b.dunkel[8][g - 1 - i as usize] = bit(i);
    }
    for i in 8..15u32 {
        b.dunkel[g - 15 + i as usize][8] = bit(i);
    }
    // Dunkelmodul: Zeile 4*Version + 9, Spalte 8. Aus der Kantenlaenge gerechnet ist das g - 8
    // (V1: 13, V2: 17, V3: 21, V4: 25).
    b.dunkel[g - 8][8] = true;
    b.reserviert[g - 8][8] = true;
}

fn maske_anwenden(b: &mut Bau, maske: u8) {
    for z in 0..b.groesse {
        for s in 0..b.groesse {
            if b.reserviert[z][s] {
                continue;
            }
            let (i, j) = (z as u32, s as u32);
            let bedingung = match maske {
                0 => (i + j) % 2 == 0,
                1 => i % 2 == 0,
                2 => j % 3 == 0,
                3 => (i + j) % 3 == 0,
                4 => (i / 2 + j / 3) % 2 == 0,
                5 => (i * j) % 2 + (i * j) % 3 == 0,
                6 => ((i * j) % 2 + (i * j) % 3) % 2 == 0,
                7 => ((i + j) % 2 + (i * j) % 3) % 2 == 0,
                _ => false,
            };
            if bedingung {
                b.dunkel[z][s] = !b.dunkel[z][s];
            }
        }
    }
}

/// Strafpunkte nach den vier Regeln der Norm (kleiner ist besser).
fn strafe(m: &[Vec<bool>]) -> u32 {
    let g = m.len();
    let mut p = 0u32;

    // Regel 1: Reihen/Spalten gleicher Farbe, ab 5 in Folge
    for richtung in 0..2 {
        for i in 0..g {
            // Achtung: bei Spalten (richtung == 1) beginnt der Lauf bei m[0][i], nicht bei m[i][0].
            // Mit dem falschen Startwert zaehlten Fuenfer-Laeufe als Vierer (0 statt 3 Punkte) und
            // die Maskenwahl wich in rund 2 % der Faelle von der Norm ab - gefunden von der
            // Gegenpruefung am 06.10.2026, vom 21-Faelle-Differentialtest NICHT gesehen.
            let mut letzte = if richtung == 0 { m[i][0] } else { m[0][i] };
            let mut lauf = 1;
            for j in 1..g {
                let w = if richtung == 0 { m[i][j] } else { m[j][i] };
                if w == letzte {
                    lauf += 1;
                } else {
                    if lauf >= 5 {
                        p += 3 + (lauf - 5);
                    }
                    letzte = w;
                    lauf = 1;
                }
            }
            if lauf >= 5 {
                p += 3 + (lauf - 5);
            }
        }
    }

    // Regel 2: gleichfarbige 2x2-Bloecke
    for i in 0..g - 1 {
        for j in 0..g - 1 {
            if m[i][j] == m[i][j + 1] && m[i][j] == m[i + 1][j] && m[i][j] == m[i + 1][j + 1] {
                p += 3;
            }
        }
    }

    // Regel 3: Muster 1011101 0000 bzw. 0000 1011101 (11 Module)
    for richtung in 0..2 {
        for i in 0..g {
            for j in 0..g.saturating_sub(10) {
                let hole = |k: usize| if richtung == 0 { m[i][j + k] } else { m[j + k][i] };
                let muster_a = [true, false, true, true, true, false, true, false, false, false, false];
                let muster_b = [false, false, false, false, true, false, true, true, true, false, true];
                if (0..11).all(|k| hole(k) == muster_a[k]) || (0..11).all(|k| hole(k) == muster_b[k]) {
                    p += 40;
                }
            }
        }
    }

    // Regel 4: Anteil dunkler Module (Ganzzahlrechnung, exakt wie die Norm es meint)
    let dunkel: usize = m.iter().map(|z| z.iter().filter(|d| **d).count()).sum();
    let gesamt = g * g;
    let anteil = (100 * dunkel) as i64 - (50 * gesamt) as i64;
    p + ((anteil.abs() / (5 * gesamt) as i64) as u32) * 10
}

/* ---------- oeffentliche Schnittstelle ---------- */

/// Groesste Nutzlast fuer eine Version und Stufe (nur fuer Fehlermeldungen und die Oberflaeche).
pub fn kapazitaet_zeichen(version: u8, stufe: Ecc) -> usize {
    let (daten_cw, _, _) = STUFEN[(version - 1) as usize][stufe_index(stufe)];
    let bits = daten_cw as usize * 8;
    // alphanumerisch: 4 Bit Modus + 9 Bit Laenge, je Zeichen 5,5 Bit
    (bits.saturating_sub(4 + Modus::Alphanumerisch.zeichenbits())) * 2 / 11
}

pub fn bilden(text: &str, stufe: Ecc, version_wunsch: Option<u8>, maske_wunsch: Option<u8>) -> Result<Qr, String> {
    let modus = modus_waehlen(text);
    let version = match version_wunsch {
        Some(v) if (1..=4).contains(&v) => v,
        Some(v) => return Err(format!("Version {v} wird nicht unterstuetzt (1 bis 4)")),
        None => {
            let mut gefunden = None;
            for v in 1..=4u8 {
                let (daten_cw, _, _) = STUFEN[(v - 1) as usize][stufe_index(stufe)];
                let probe = nutzbits(text, modus)?;
                if probe.laenge() <= daten_cw as usize * 8 {
                    gefunden = Some(v);
                    break;
                }
            }
            gefunden.ok_or_else(|| {
                format!(
                    "Text zu lang fuer Version 4, Stufe {}: {} Zeichen. Hoechstlaenge ist {} Zeichen.",
                    stufe.name(),
                    text.chars().count(),
                    kapazitaet_zeichen(4, stufe)
                )
            })?
        }
    };

    let daten = datencodewoerter(text, version, stufe)?;
    let gf = Gf::neu();
    let (_, ec_je_block, bloecke) = STUFEN[(version - 1) as usize][stufe_index(stufe)];
    let daten_je_block = daten.len() / bloecke as usize;

    // Bloecke bilden und Fehlerkorrektur anhaengen
    let mut datenbloecke: Vec<Vec<u8>> = Vec::new();
    let mut ecbloecke: Vec<Vec<u8>> = Vec::new();
    for i in 0..bloecke as usize {
        let block = daten[i * daten_je_block..(i + 1) * daten_je_block].to_vec();
        ecbloecke.push(ec_codewoerter(&gf, &block, ec_je_block as usize));
        datenbloecke.push(block);
    }

    // Interleaving: erst alle Datencodewoerter spaltenweise, dann alle EC-Codewoerter
    let mut folge: Vec<u8> = Vec::new();
    for i in 0..daten_je_block {
        for b in &datenbloecke {
            folge.push(b[i]);
        }
    }
    for i in 0..ec_je_block as usize {
        for b in &ecbloecke {
            folge.push(b[i]);
        }
    }

    // Matrix bauen
    let groesse = 17 + 4 * version as usize;
    let mut bau = Bau::neu(groesse);
    bau.sucher(0, 0, false, false);
    bau.sucher(0, groesse - 8, true, false);
    bau.sucher(groesse - 8, 0, false, true);
    bau.takt();
    let mitte = AUSRICHTUNG[(version - 1) as usize];
    for &z in mitte {
        for &s in mitte {
            // Die drei Ecken liegen auf den Suchermustern und bleiben frei
            let ecke = (z <= 8 && s <= 8) || (z <= 8 && s >= groesse - 9) || (z >= groesse - 9 && s <= 8);
            if !ecke {
                bau.ausrichtung(z, s);
            }
        }
    }
    bau.format_reservieren();

    // Datenbits im Zickzack einsetzen
    let mut bits: Vec<bool> = Vec::with_capacity(folge.len() * 8 + 7);
    for cw in &folge {
        for i in (0..8).rev() {
            bits.push((cw >> i) & 1 == 1);
        }
    }
    for _ in 0..restbits(version) {
        bits.push(false);
    }
    let mut nr = 0usize;
    let mut spalte = groesse as isize - 1;
    let mut auf = true;
    while spalte > 0 {
        if spalte == 6 {
            spalte = 5;
        }
        for i in 0..groesse {
            let z = if auf { groesse - 1 - i } else { i };
            for k in 0..2 {
                let s = (spalte - k as isize) as usize;
                if !bau.reserviert[z][s] {
                    let wert = bits.get(nr).copied().unwrap_or(false);
                    nr += 1;
                    bau.dunkel[z][s] = wert;
                }
            }
        }
        auf = !auf;
        spalte -= 2;
    }

    // Maske: fest oder nach Strafregeln
    let (maske, automatisch) = match maske_wunsch {
        Some(m) if m <= 7 => (m, false),
        Some(m) => return Err(format!("Maske {m} gibt es nicht (0 bis 7)")),
        None => {
            let mut beste = 0u8;
            let mut bestwert = u32::MAX;
            for m in 0..8u8 {
                let mut probe = Bau { groesse, dunkel: bau.dunkel.clone(), reserviert: bau.reserviert.clone() };
                maske_anwenden(&mut probe, m);
                format_setzen(&mut probe, stufe, m);
                let wert = strafe(&probe.dunkel);
                if wert < bestwert {
                    bestwert = wert;
                    beste = m;
                }
            }
            (beste, true)
        }
    };
    maske_anwenden(&mut bau, maske);
    format_setzen(&mut bau, stufe, maske);

    Ok(Qr { text: text.to_string(), version, ecc: stufe, modus, maske, automatisch, matrix: bau.dunkel })
}

/* ---------- Ausgabe ---------- */

/// SVG mit Ruhezone (Vorgabe 4 Module) und 1 Modul = `modul_px` Bildpunkten.
/// Dunkel auf hell, scharfe Kanten - so bleibt das Bild beim Beamer-Skalieren lesbar.
pub fn svg(qr: &Qr, modul_px: u32, ruhe: u32) -> String {
    let g = qr.groesse() as u32;
    let kante = (g + 2 * ruhe) * modul_px;
    let mut s = String::new();
    s.push_str(&format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{kante}\" height=\"{kante}\" viewBox=\"0 0 {kante} {kante}\" shape-rendering=\"crispEdges\" role=\"img\" aria-label=\"QR-Code\">\n"
    ));
    s.push_str(&format!("<rect width=\"{kante}\" height=\"{kante}\" fill=\"#ffffff\"/>\n<path fill=\"#000000\" d=\""));
    for (z, zeile) in qr.matrix.iter().enumerate() {
        for (sp, d) in zeile.iter().enumerate() {
            if *d {
                let x = (sp as u32 + ruhe) * modul_px;
                let y = (z as u32 + ruhe) * modul_px;
                s.push_str(&format!("M{x} {y}h{modul_px}v{modul_px}h-{modul_px}z"));
            }
        }
    }
    s.push_str("\"/>\n</svg>\n");
    s
}

/// Base64 (Standardalphabet mit Auffuellung) - fuer den Daten-URI, ohne fremde Kiste.
pub fn base64(daten: &[u8]) -> String {
    const A: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut aus = String::with_capacity(daten.len().div_ceil(3) * 4);
    for stueck in daten.chunks(3) {
        let b = [stueck[0], *stueck.get(1).unwrap_or(&0), *stueck.get(2).unwrap_or(&0)];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        aus.push(A[(n >> 18) as usize & 63] as char);
        aus.push(A[(n >> 12) as usize & 63] as char);
        aus.push(if stueck.len() > 1 { A[(n >> 6) as usize & 63] as char } else { '=' });
        aus.push(if stueck.len() > 2 { A[n as usize & 63] as char } else { '=' });
    }
    aus
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kapazitaet_v1h_ist_zehn() {
        assert_eq!(kapazitaet_zeichen(1, Ecc::H), 10);
        assert_eq!(kapazitaet_zeichen(1, Ecc::L), 25);
    }

    #[test]
    fn zehn_zeichen_passen_elf_nicht() {
        let a = bilden("NL-4F7K-2Q", Ecc::H, Some(1), Some(0));
        assert!(a.is_ok(), "{:?}", a.err());
        let b = bilden("NL-4F7K-2QX", Ecc::H, Some(1), Some(0));
        assert!(b.is_err());
    }

    #[test]
    fn format_info_bekannte_werte() {
        // Aus der Normentabelle: M, Maske 0 -> 101010000010010
        assert_eq!(format_info(Ecc::M, 0), 0b101010000010010);
        // L, Maske 0 -> 111011111000100
        assert_eq!(format_info(Ecc::L, 0), 0b111011111000100);
        // H, Maske 0 -> 001011010001001
        assert_eq!(format_info(Ecc::H, 0), 0b001011010001001);
    }

    #[test]
    fn takt_und_sucher_stehen() {
        let qr = bilden("NL-4F7K-2Q", Ecc::H, Some(1), Some(0)).unwrap();
        assert_eq!(qr.groesse(), 21);
        assert!(qr.matrix[0][0] && qr.matrix[6][6] && qr.matrix[0][20] && qr.matrix[20][0]);
        // Taktmuster
        assert!(qr.matrix[6][8] && !qr.matrix[6][9]);
        // Dunkelmodul (muss bei JEDER Stufe und Maske dunkel sein)
        for stufe in [Ecc::L, Ecc::M, Ecc::Q, Ecc::H] {
            for maske in 0..8u8 {
                let q = bilden("NL-4F7K-2Q", stufe, Some(1), Some(maske)).unwrap();
                assert!(q.matrix[13][8], "Dunkelmodul hell bei Stufe {} Maske {maske}", stufe.name());
            }
        }
    }

    #[test]
    fn reed_solomon_bekanntes_beispiel() {
        // Beispiel aus der QR-Norm-Literatur ("HELLO WORLD", Version 1-Q):
        // 13 Datencodewoerter -> 13 Pruefcodewoerter.
        let gf = Gf::neu();
        let daten = [32u8, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236];
        let erwartet = [168u8, 72, 22, 82, 217, 54, 156, 0, 46, 15, 180, 122, 16];
        assert_eq!(ec_codewoerter(&gf, &daten, 13), erwartet.to_vec());
    }
}
