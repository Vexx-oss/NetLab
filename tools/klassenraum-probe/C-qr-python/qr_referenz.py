#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
qr_referenz.py - Unabhaengige Referenzimplementierung: QR Code Model 2 (ISO/IEC 18004).

ZWECK
    Erzeugt die QR-Matrix Zelle fuer Zelle nach der Norm. Dient als
    Differentialtest gegen den (abhaengigkeitsfreien, nur-std) Rust-Encoder
    von Stufe D: beide muessen dieselbe Matrix liefern.

UMFANG
    - Versionen 1..4, Fehlerkorrekturstufen L, M, Q, H
    - Modi: alphanumerisch (0010) und Byte (0100)
    - Masken 0..7, Auswahl automatisch nach den vier Strafregeln der Norm
      oder fest per --maske
    - Reed-Solomon ueber GF(256), Primitive 0x11D
    - Blockaufteilung, Interleaving, Restbits
    - Format-Info BCH(15,5), Generator 0x537, XOR-Maske 0x5412
    - Suchermuster, Taktmuster, Ausrichtungsmuster, Dunkelmodul

NUR STANDARDBIBLIOTHEK. Kein qrcode, kein segno, kein PIL/Pillow, kein numpy.

AUFRUF
    python qr_referenz.py --text "NL-4F7K-2Q" --ecc H --version 1 --maske 0
    python qr_referenz.py --text "NL-4F7K-2Q" --ecc H --version 1 --maske auto
    python qr_referenz.py --text "NL-4F7K-2Q" --ecc H --version 1 --svg bild.svg
    python qr_referenz.py --selbsttest

AUSGABE (stdout: GENAU EIN JSON-Objekt, sonst nichts)
    {"text":..,"version":..,"ecc":..,"maske":..,"auto":..,"groesse":..,
     "matrix":[..],"sha256":".."}

    matrix   Liste von Zeichenketten aus "0" (hell) und "1" (dunkel), Zeile fuer Zeile.
    sha256   SHA256 ueber die UTF-8-Bytes von "\n".join(matrix) OHNE abschliessenden
             Zeilenumbruch.

RUECKGABEWERTE
    0 = ok
    1 = Nutzfehler (Text zu lang, unbekannte ECC-Stufe, Matrix unbrauchbar)
    2 = Aufruffehler (fehlende/ungueltige Argumente)

BEISPIEL-SHA256 (V1, H, Maske 0, Text "NL-4F7K-2Q")
    siehe Ausgabe von --selbsttest; die Matrix ist dort festgenagelt.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys

# ---------------------------------------------------------------------------
# Feste Kenngroessen der Norm
# ---------------------------------------------------------------------------

# Groesse = 17 + 4 * version  ->  V1:21 V2:25 V3:29 V4:33
VERSIONEN = (1, 2, 3, 4)

ECC_STUFEN = ("L", "M", "Q", "H")

# Format-Info: 2 Bit je Stufe (ISO/IEC 18004, Tabelle 25)
ECC_FORMAT_BITS = {"L": 0b01, "M": 0b00, "Q": 0b11, "H": 0b10}

MODUS_ALNUM = 0b0010
MODUS_BYTE = 0b0100

# Alphanumerisches Alphabet (ISO/IEC 18004, Tabelle 5) - genau 45 Zeichen.
ALNUM_ZEICHEN = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"

# Zeichenzaehl-Indikator in Bit je Modus und Versionsgruppe (Tabelle 3)
ZAEHL_BITS = {
    MODUS_ALNUM: (9, 11),   # Version 1..9, Version 10..26
    MODUS_BYTE: (8, 16),    # Version 1..9, Version 10..26
}

# Gesamtzahl der Codewoerter (Daten + Fehlerkorrektur) je Version (Tabelle 1)
GESAMT_CODEWORTS = {1: 26, 2: 44, 3: 70, 4: 100}

# Restbits je Version (Tabelle 1, Spalte "Restbits")
RESTBITS = {1: 0, 2: 7, 3: 7, 4: 7}

# Blockstruktur je (Version, Stufe): (Anzahl Bloecke, Datenwort je Block)
# Quelle: ISO/IEC 18004, Tabelle 13..16 (Fehlerkorrekturbloecke).
# Alle Gruppen sind "gleichmaessig": gleiche Blocklaenge je Block.
BLOCKSTRUKTUR = {
    (1, "L"): (1, 19), (1, "M"): (1, 16), (1, "Q"): (1, 13), (1, "H"): (1, 9),
    (2, "L"): (1, 34), (2, "M"): (1, 28), (2, "Q"): (1, 22), (2, "H"): (1, 16),
    (3, "L"): (1, 55), (3, "M"): (1, 44), (3, "Q"): (2, 17), (3, "H"): (2, 13),
    (4, "L"): (1, 80), (4, "M"): (2, 32), (4, "Q"): (2, 24), (4, "H"): (4, 9),
}

# Ausrichtungsmuster: Mittelpunkt-Koordinaten je Version (Tabelle E.1)
AUSRICHTUNG_ZENTREN = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
}

# Strafregel-Gewichte (Tabelle 24)
STRAFE_N1 = 3
STRAFE_N2 = 3
STRAFE_N3 = 40
STRAFE_N4 = 10

DUNKELMODUL_ZEILE = 4 * 0 + 9  # wird je Version berechnet: 4*version + 9


class QrFehler(Exception):
    """Nutzfehler: Eingabe passt nicht in die gewaehlte Version/Stufe."""


# ---------------------------------------------------------------------------
# GF(256) - Galoisfeld mit primitivem Polynom 0x11D (x^8+x^4+x^3+x^2+1)
# ---------------------------------------------------------------------------

GF_PRIMITIV = 0x11D
GF_EXP = [0] * 512
GF_LOG = [0] * 256


def _gf_tabellen_bauen() -> None:
    """Log/Exp-Tabellen fuer GF(256) aufbauen (einmalig)."""
    x = 1
    for i in range(255):
        GF_EXP[i] = x
        GF_LOG[x] = i
        x <<= 1
        if x & 0x100:
            x ^= GF_PRIMITIV
    for i in range(255, 512):
        GF_EXP[i] = GF_EXP[i - 255]


_gf_tabellen_bauen()


def gf_mul(a: int, b: int) -> int:
    """Multiplikation in GF(256)."""
    if a == 0 or b == 0:
        return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]


def gf_potenz(a: int, n: int) -> int:
    """a^n in GF(256)."""
    if n == 0:
        return 1
    if a == 0:
        return 0
    return GF_EXP[(GF_LOG[a] * n) % 255]


# ---------------------------------------------------------------------------
# Reed-Solomon
# ---------------------------------------------------------------------------

_rs_generator_cache: dict[int, list[int]] = {}


def rs_generator_polynom(grad: int) -> list[int]:
    """
    Generatorpolynom g(x) = Produkt (x - a^i), i = 0..grad-1.
    Rueckgabe: Koeffizienten ab dem hoechsten Grad (Leitkoeffizient zuerst),
    Laenge grad + 1, Leitkoeffizient 1.
    """
    if grad in _rs_generator_cache:
        return _rs_generator_cache[grad]
    g = [1]
    for i in range(grad):
        # g = g * (x + a^i)
        neu = [0] * (len(g) + 1)
        for j, k in enumerate(g):
            neu[j] ^= k                        # * x
            neu[j + 1] ^= gf_mul(k, GF_EXP[i])  # * a^i
        g = neu
    _rs_generator_cache[grad] = g
    return g


def rs_kodieren(daten: bytes | bytearray | list[int], ecc_laenge: int) -> list[int]:
    """
    Reed-Solomon ueber GF(256): liefert die ecc_laenge Fehlerkorrektur-Codewoerter.

    Verfahren: Datenblock wird mit ecc_laenge Nullbytes erweitert und der Rest
    der Polynomdivision durch g(x) gebildet. Der Rest IST das ECC-Wort
    (systematische Kodierung, wie in der Norm gefordert).
    """
    g = rs_generator_polynom(ecc_laenge)
    rest = [0] * ecc_laenge
    for byte in daten:
        faktor = byte ^ rest[0]
        rest = rest[1:] + [0]
        if faktor != 0:
            lf = GF_LOG[faktor]
            for i in range(ecc_laenge):
                gi = g[i + 1]  # g[0] ist 1 und wird nicht gebraucht
                if gi:
                    rest[i] ^= GF_EXP[lf + GF_LOG[gi]]
    return rest


def rs_syndrome(codeworts: list[int], ecc_laenge: int) -> list[int]:
    """
    Syndrome S_i = C(a^i) fuer i = 0..ecc_laenge-1.
    Ein fehlerfreies Codewort liefert durchweg 0.
    """
    syndrome = []
    for i in range(ecc_laenge):
        a_i = GF_EXP[i]
        wert = 0
        for c in codeworts:
            wert = gf_mul(wert, a_i) ^ c
        syndrome.append(wert)
    return syndrome


# ---------------------------------------------------------------------------
# Nutzdaten -> Bitstrom
# ---------------------------------------------------------------------------

def modus_waehlen(text: str, modus: str) -> int:
    """Modus-Kennung bestimmen. 'auto' bevorzugt alphanumerisch, sonst Byte."""
    if modus == "alnum":
        return MODUS_ALNUM
    if modus == "byte":
        return MODUS_BYTE
    if modus == "auto":
        return MODUS_ALNUM if alle_alnum(text) else MODUS_BYTE
    raise QrFehler(f"unbekannter Modus: {modus!r}")


def alle_alnum(text: str) -> bool:
    """True, wenn jedes Zeichen im alphanumerischen Alphabet liegt."""
    return all(z in ALNUM_ZEICHEN for z in text)


def zaehlbits(modus: int, version: int) -> int:
    """Laenge des Zeichenzaehl-Indikators in Bit."""
    gruppe = 0 if version <= 9 else 1
    return ZAEHL_BITS[modus][gruppe]


def nutzdaten_bits(text: str, modus: int) -> list[int]:
    """Nutzlast in Bitform (ohne Modus und ohne Zaehler)."""
    if modus == MODUS_ALNUM:
        if not alle_alnum(text):
            ungueltig = sorted({z for z in text if z not in ALNUM_ZEICHEN})
            raise QrFehler(
                "Text enthaelt Zeichen ausserhalb des alphanumerischen Alphabets: "
                + " ".join(repr(z) for z in ungueltig)
            )
        bits: list[int] = []
        i = 0
        while i + 1 < len(text):
            wert = ALNUM_ZEICHEN.index(text[i]) * 45 + ALNUM_ZEICHEN.index(text[i + 1])
            for s in range(10, -1, -1):  # 11 Bit, hoechstwertiges zuerst
                bits.append((wert >> s) & 1)
            i += 2
        if i < len(text):
            wert = ALNUM_ZEICHEN.index(text[i])
            for s in range(5, -1, -1):  # 6 Bit
                bits.append((wert >> s) & 1)
        return bits

    # Byte-Modus (0100): 8 Bit je Byte, UTF-8 wie vom Aufrufer geliefert
    roh = text.encode("utf-8")
    bits = []
    for byte in roh:
        for s in range(7, -1, -1):
            bits.append((byte >> s) & 1)
    return bits


def nachricht_bits(text: str, version: int, ecc: str, modus: int) -> list[int]:
    """Vollstaendige Nutzdatenbitfolge: Modus + Zaehler + Nutzlast."""
    daten = nutzdaten_bits(text, modus)

    if modus == MODUS_ALNUM:
        anzahl = len(text)
    else:
        anzahl = len(text.encode("utf-8"))

    bits: list[int] = []
    for s in range(3, -1, -1):  # 4 Bit Modus-Indikator
        bits.append((modus >> s) & 1)
    n_zaehl = zaehlbits(modus, version)
    for s in range(n_zaehl - 1, -1, -1):
        bits.append((anzahl >> s) & 1)
    bits.extend(daten)
    return bits


def daten_codewoerter(text: str, version: int, ecc: str, modus: int) -> tuple[list[int], int]:
    """
    Nutzdatenbitfolge -> Daten-Codewoerter mit Terminator, Bitauffuellung und
    Fuellbytes 0xEC/0x11. Rueckgabe: (Codewoerter, benoetigte Nutzbits).
    """
    anzahl_bloecke, daten_je_block = BLOCKSTRUKTUR[(version, ecc)]
    kapazitaet = anzahl_bloecke * daten_je_block
    bits = nachricht_bits(text, version, ecc, modus)

    if len(bits) > kapazitaet * 8:
        raise QrFehler(
            f"Text zu lang: {len(bits)} Nutzbits benoetigt, "
            f"{kapazitaet * 8} Bit verfuegbar (Version {version}, Stufe {ecc})."
        )

    benoetigte_bits = len(bits)

    # Terminator: bis zu 4 Nullbits, nur solange Platz ist
    for _ in range(4):
        if len(bits) < kapazitaet * 8:
            bits.append(0)

    # Auf Bytegrenze auffuellen
    while len(bits) % 8 != 0:
        bits.append(0)

    # Fuellbytes im Wechsel 0xEC, 0x11
    fuell = (0xEC, 0x11)
    i = 0
    while len(bits) < kapazitaet * 8:
        byte = fuell[i % 2]
        for s in range(7, -1, -1):
            bits.append((byte >> s) & 1)
        i += 1

    codewoerter = []
    for i in range(0, len(bits), 8):
        wert = 0
        for b in bits[i:i + 8]:
            wert = (wert << 1) | b
        codewoerter.append(wert)

    assert len(codewoerter) == kapazitaet, "Datenkapazitaet verletzt"
    return codewoerter, benoetigte_bits


def bloecke_bilden(daten: list[int], version: int, ecc: str) -> list[list[int]]:
    """Daten-Codewoerter in Bloecke schneiden und je Block ECC anhaengen."""
    anzahl_bloecke, daten_je_block = BLOCKSTRUKTUR[(version, ecc)]
    gesamt_ecc = GESAMT_CODEWORTS[version] - anzahl_bloecke * daten_je_block
    ecc_je_block = gesamt_ecc // anzahl_bloecke

    bloecke = []
    pos = 0
    for _ in range(anzahl_bloecke):
        block = daten[pos:pos + daten_je_block]
        pos += daten_je_block
        bloecke.append(block + rs_kodieren(block, ecc_je_block))
    assert pos == len(daten), "Blockaufteilung passt nicht zu den Daten"
    return bloecke


def interleaven(bloecke: list[list[int]], version: int, ecc: str) -> list[int]:
    """
    Interleaving nach ISO/IEC 18004 Abschnitt 8.6:
    erst spaltenweise alle Daten-Codewoerter, dann spaltenweise alle ECC-Codewoerter.
    """
    anzahl_bloecke, daten_je_block = BLOCKSTRUKTUR[(version, ecc)]
    ecc_je_block = len(bloecke[0]) - daten_je_block

    folge: list[int] = []
    for i in range(daten_je_block):
        for block in bloecke:
            folge.append(block[i])
    for i in range(ecc_je_block):
        for block in bloecke:
            folge.append(block[daten_je_block + i])
    return folge


def restbit_folge(version: int) -> list[int]:
    """Restbits (alle 0) hinter der Codewortfolge."""
    return [0] * RESTBITS[version]


def bits_aus_codewoertern(codewoerter: list[int]) -> list[int]:
    """
    Codewoerter in die Bitfolge zerlegen (je Byte 8 Bit, hoechstwertiges zuerst).
    Der Zickzack traegt BITS ein, nicht Codewoerter - ohne diesen Schritt
    landen ganze Bytewerte in einzelnen Zellen und die Matrix ist unbrauchbar.
    """
    bits: list[int] = []
    for wort in codewoerter:
        if not 0 <= wort <= 255:
            raise QrFehler(f"Codewort {wort} liegt ausserhalb 0..255.")
        for s in range(7, -1, -1):
            bits.append((wort >> s) & 1)
    return bits


# ---------------------------------------------------------------------------
# Format-Information BCH(15,5)
# ---------------------------------------------------------------------------

def bch_rest(wert: int, generator: int, grad: int) -> int:
    """Rest der Polynomdivision wert / generator ueber GF(2)."""
    rest = wert
    for i in range(wert.bit_length() - 1, grad - 1, -1):
        if (rest >> i) & 1:
            rest ^= generator << (i - grad)
    return rest


def format_bits(ecc: str, maske: int) -> int:
    """
    Format-Information: 5 Datenbits (2 ECC + 3 Maske), 10 BCH-Pruefbits
    (Generator 0x537 = x^10+x^8+x^5+x^4+x^2+x+1), dann XOR mit 0x5412.
    """
    daten = (ECC_FORMAT_BITS[ecc] << 3) | maske
    wert = (daten << 10) | bch_rest(daten << 10, 0x537, 10)
    return wert ^ 0x5412


# ---------------------------------------------------------------------------
# Matrize aufbauen
# ---------------------------------------------------------------------------

class Matrix:
    """QR-Matrize mit Reservierungsmarkierung fuer Funktionsmuster."""

    def __init__(self, version: int) -> None:
        self.version = version
        self.groesse = 17 + 4 * version
        self.modul = [[0] * self.groesse for _ in range(self.groesse)]   # 0 hell, 1 dunkel
        self.reserviert = [[False] * self.groesse for _ in range(self.groesse)]

    def setzen(self, zeile: int, spalte: int, dunkel: int) -> None:
        """Modul setzen und als belegt markieren."""
        self.modul[zeile][spalte] = 1 if dunkel else 0
        self.reserviert[zeile][spalte] = True

    def holen(self, zeile: int, spalte: int) -> int:
        """Modulwert lesen; ausserhalb der Matrize gilt 0 (hell)."""
        if 0 <= zeile < self.groesse and 0 <= spalte < self.groesse:
            return self.modul[zeile][spalte]
        return 0


def suchermuster_setzen(m: Matrix) -> None:
    """
    Drei Suchermuster (7x7) mit Trennern.
    Muster: 3x3 dunkel, umlaufender heller Ring, umlaufender dunkler Rahmen.
    """
    positionen = ((0, 0), (0, m.groesse - 7), (m.groesse - 7, 0))
    for zeile0, spalte0 in positionen:
        for dz in range(-1, 8):
            for ds in range(-1, 8):
                z = zeile0 + dz
                s = spalte0 + ds
                if not (0 <= z < m.groesse and 0 <= s < m.groesse):
                    continue
                if 0 <= dz <= 6 and 0 <= ds <= 6:
                    rand = dz in (0, 6) or ds in (0, 6)
                    kern = 2 <= dz <= 4 and 2 <= ds <= 4
                    m.setzen(z, s, 1 if (rand or kern) else 0)
                else:
                    m.setzen(z, s, 0)  # Trenner


def taktmuster_setzen(m: Matrix) -> None:
    """Taktmuster in Zeile 6 und Spalte 6: dunkel bei geradem Index."""
    for i in range(8, m.groesse - 8):
        m.setzen(6, i, 1 if i % 2 == 0 else 0)
        m.setzen(i, 6, 1 if i % 2 == 0 else 0)


def ausrichtungsmuster_setzen(m: Matrix) -> None:
    """
    Ausrichtungsmuster (5x5): dunkler Rahmen, heller Ring, dunkler Kern.
    Uebersprungen wird, wo das Muster mit einem Suchermuster kollidiert.
    """
    zentren = AUSRICHTUNG_ZENTREN[m.version]
    letzte = m.groesse - 7
    for z in zentren:
        for s in zentren:
            if (z == 6 and s == 6) or (z == 6 and s == letzte) or (z == letzte and s == 6):
                continue
            for dz in range(-2, 3):
                for ds in range(-2, 3):
                    rand = max(abs(dz), abs(ds))
                    m.setzen(z + dz, s + ds, 1 if rand != 1 else 0)


def dunkelmodul_setzen(m: Matrix) -> None:
    """Dunkelmodul bei (4*version + 9, 8) - immer dunkel."""
    m.setzen(4 * m.version + 9, 8, 1)


def formatbereich_reservieren(m: Matrix) -> None:
    """
    Die beiden Format-Info-Bereiche VOR dem Eintragen der Daten reservieren.

    Ohne diesen Schritt bleibt die Zelle (8, 4*version + 9) unreserviert: sie
    gehoert zur zweiten Format-Info-Kopie (Bit 14), liegt aber in dem Streifen,
    den der Zickzack zuerst durchlaeuft. Der Zickzack schriebe dort ein Datum
    hinein, das die Format-Info anschliessend ueberschreibt - ein Datenbit
    ginge verloren und die Reed-Solomon-Syndrome waeren nicht mehr 0.
    Deshalb wird der Bereich hier nur BELEGT (reserviert), nicht beschrieben.
    """
    n = m.groesse
    for i in range(9):
        m.reserviert[8][i] = True      # Zeile 8 links (Bits 8..0)
        m.reserviert[i][8] = True      # Spalte 8 oben (Bits 14..6)
    for i in range(8):
        m.reserviert[8][n - 1 - i] = True   # Zeile 8 rechts (Bits 14..7)
    for i in range(7):
        m.reserviert[n - 1 - i][8] = True   # Spalte 8 unten (Bits 7..0)


def format_info_setzen(m: Matrix, ecc: str, maske: int) -> None:
    """
    Format-Information an beiden vorgeschriebenen Stellen eintragen.
    Bit 14 ist das hoechstwertige Bit, Bit 0 das niederwertigste.
    """
    formatbereich_reservieren(m)
    bits = format_bits(ecc, maske)
    n = m.groesse

    # Linke Kopie: Spalte 8, Zeilen 0..8 und Zeile 8, Spalten 7..8
    for i in range(6):
        m.setzen(i, 8, (bits >> i) & 1)
    m.setzen(7, 8, (bits >> 6) & 1)
    m.setzen(8, 8, (bits >> 7) & 1)
    m.setzen(8, 7, (bits >> 8) & 1)
    for i in range(9, 15):
        m.setzen(8, 14 - i, (bits >> i) & 1)

    # Zweite Kopie: Zeile 8 rechts (Spalten n-1 .. n-8, Bits 0..7) und
    # Spalte 8 unten (Zeilen n-7 .. n-1, Bits 8..14).
    #
    # BERICHTIGT am 06.10.2026 nach dem Differentialtest gegen den Rust-Encoder
    # (tools/klassenraum-probe/C-qr-rust): Vorher stand hier die transponierte Fassung
    # (Bits 0..7 in Spalte 8, Bits 8..14 in Zeile 8). Das war falsch, denn dann schreibt
    # Bit 7 in die Zelle (n-8, 8) - und das ist laut Norm das DUNKELMODUL, das immer
    # dunkel sein muss. Gemessen: mit der alten Fassung war das Dunkelmodul bei den
    # Stufen M und Q hell (Bit 7 der Formatinformation ist dort 0), z. B.
    # "NL-4F7K-2Q", Stufe M, Version 1, Maske 0 -> Matrix[13][8] == 0 statt 1.
    for i in range(8):
        m.setzen(8, n - 1 - i, (bits >> i) & 1)
    for i in range(8, 15):
        m.setzen(n - 15 + i, 8, (bits >> i) & 1)


def funktionsmuster_setzen(m: Matrix, ecc: str, maske: int) -> None:
    """Alle Funktionsmuster in der normgemaessen Reihenfolge setzen."""
    suchermuster_setzen(m)
    taktmuster_setzen(m)
    ausrichtungsmuster_setzen(m)
    dunkelmodul_setzen(m)
    format_info_setzen(m, ecc, maske)


def daten_eintragen(m: Matrix, folge: list[int]) -> None:
    """
    Codewortfolge im Zickzack eintragen (ISO/IEC 18004, Abschnitt 8.7.3):
    von rechts nach links in 2 Spalten breiten Streifen, Richtung wechselnd,
    reservierte Module werden uebersprungen, Spalte 6 wird uebersprungen.

    ERWARTET EINE BITFOLGE (Werte 0/1), nicht Codewoerter! Codewoerter muessen
    vorher mit bits_aus_codewoertern() in einzelne Bits zerlegt werden.
    """
    if any(b not in (0, 1) for b in folge):
        raise QrFehler(
            "daten_eintragen erwartet eine Bitfolge aus 0 und 1, "
            f"bekam aber Werte bis {max(folge)} - Codewoerter erst in Bits zerlegen."
        )

    bit_index = 0
    gesamt = len(folge)
    spalte = m.groesse - 1
    aufwaerts = True

    while spalte > 0:
        if spalte == 6:  # Taktspalte wird uebersprungen
            spalte -= 1
        zeilen = range(m.groesse - 1, -1, -1) if aufwaerts else range(m.groesse)
        for zeile in zeilen:
            for s in (spalte, spalte - 1):
                if m.reserviert[zeile][s]:
                    continue
                if bit_index < gesamt:
                    m.modul[zeile][s] = folge[bit_index]
                    bit_index += 1
                else:
                    m.modul[zeile][s] = 0  # Restbits sind 0
        aufwaerts = not aufwaerts
        spalte -= 2

    if bit_index != gesamt:
        raise QrFehler(
            f"Platzierungsfehler: {bit_index} von {gesamt} Bits eingetragen "
            "(Matrizengeometrie passt nicht zur Codewortzahl)."
        )


# ---------------------------------------------------------------------------
# Masken
# ---------------------------------------------------------------------------

MASKBEDINGUNGEN = (
    lambda z, s: (z + s) % 2 == 0,                 # 0
    lambda z, s: z % 2 == 0,                       # 1
    lambda z, s: s % 3 == 0,                       # 2
    lambda z, s: (z + s) % 3 == 0,                 # 3
    lambda z, s: (z // 2 + s // 3) % 2 == 0,       # 4
    lambda z, s: (z * s) % 2 + (z * s) % 3 == 0,   # 5
    lambda z, s: ((z * s) % 2 + (z * s) % 3) % 2 == 0,  # 6
    lambda z, s: ((z + s) % 2 + (z * s) % 3) % 2 == 0,  # 7
)


def maske_anwenden(m: Matrix, maske: int) -> None:
    """
    Maske auf alle Datemodule anwenden (XOR). Funktionsmuster bleiben unberuehrt:
    die Format-Info wird vom Aufrufer nach dem Maskieren neu gesetzt.
    """
    bedingung = MASKBEDINGUNGEN[maske]
    for z in range(m.groesse):
        for s in range(m.groesse):
            if m.reserviert[z][s]:
                continue
            if bedingung(z, s):
                m.modul[z][s] ^= 1


# ---------------------------------------------------------------------------
# Strafregeln der Norm (Tabelle 24)
# ---------------------------------------------------------------------------

def strafe_regel1(m: Matrix) -> int:
    """
    Regel 1: je Folge von 5 oder mehr gleichfarbigen Modulen in Zeile oder
    Spalte 3 Punkte, fuer jedes weitere Modul 1 Punkt dazu.
    """
    punkte = 0
    n = m.groesse
    for richtung in (0, 1):  # 0 = Zeilen, 1 = Spalten
        for i in range(n):
            lauf_farbe = -1
            lauf = 0
            for j in range(n):
                farbe = m.modul[i][j] if richtung == 0 else m.modul[j][i]
                if farbe == lauf_farbe:
                    lauf += 1
                else:
                    if lauf >= 5:
                        punkte += STRAFE_N1 + (lauf - 5)
                    lauf_farbe = farbe
                    lauf = 1
            if lauf >= 5:
                punkte += STRAFE_N1 + (lauf - 5)
    return punkte


def strafe_regel2(m: Matrix) -> int:
    """Regel 2: je 2x2-Block gleichfarbiger Module 3 Punkte."""
    punkte = 0
    for z in range(m.groesse - 1):
        for s in range(m.groesse - 1):
            farbe = m.modul[z][s]
            if (m.modul[z][s + 1] == farbe
                    and m.modul[z + 1][s] == farbe
                    and m.modul[z + 1][s + 1] == farbe):
                punkte += STRAFE_N2
    return punkte


# Muster 1:1:3:1:1 mit vier hellen Modulen auf einer Seite (Tabelle 24)
MUSTER_A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]  # 1011101 0000
MUSTER_B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]  # 0000 1011101


def _muster_treffer(fenster: list[int]) -> bool:
    return fenster == MUSTER_A or fenster == MUSTER_B


def strafe_regel3(m: Matrix) -> int:
    """Regel 3: je Vorkommen des Musters 1:1:3:1:1 in Zeile/Spalte 40 Punkte."""
    punkte = 0
    n = m.groesse
    for richtung in (0, 1):
        for i in range(n):
            zeile = m.modul[i] if richtung == 0 else [m.modul[k][i] for k in range(n)]
            for start in range(n - 10):
                if _muster_treffer(zeile[start:start + 11]):
                    punkte += STRAFE_N3
    return punkte


def strafe_regel4(m: Matrix) -> int:
    """
    Regel 4: Abweichung des Dunkelanteils von 50 %.
    k = ganzzahliger Anteil von |Dunkelanteil - 50 %| / 5 %, Strafe = k * 10.

    Bewusst OHNE Fliesskomma: der Anteil wird als Bruch gerechnet, damit die
    Abrundung an der 5-Prozent-Grenze exakt sitzt. Eine Fliesskommarechnung
    mit "ceil" auf den Rest ergab schon bei 0,8 % Abweichung 10 Strafpunkte
    und damit eine falsche Maskenwahl.
    """
    dunkel = sum(sum(zeile) for zeile in m.modul)
    gesamt = m.groesse * m.groesse
    # |dunkel/gesamt - 1/2| * 100 / 5 = |100*dunkel - 50*gesamt| / (5*gesamt)
    abweichung = abs(100 * dunkel - 50 * gesamt)
    stufen = abweichung // (5 * gesamt)
    return stufen * STRAFE_N4


def strafe_gesamt(m: Matrix) -> int:
    """Summe der vier Strafregeln."""
    return (strafe_regel1(m) + strafe_regel2(m)
            + strafe_regel3(m) + strafe_regel4(m))


# ---------------------------------------------------------------------------
# Vollstaendige Kodierung
# ---------------------------------------------------------------------------

def matrix_erzeugen(text: str, version: int, ecc: str, maske, modus: str = "auto"):
    """
    Vollstaendige Kodierung.

    Rueckgabe: (matrix als Liste von "0"/"1"-Zeichenketten, gewaehlte Maske,
                benoetigte Nutzbits)
    """
    if version not in VERSIONEN:
        raise QrFehler(f"Version {version} wird nicht unterstuetzt (1..4).")
    if ecc not in ECC_STUFEN:
        raise QrFehler(f"ECC-Stufe {ecc!r} unbekannt (L, M, Q, H).")
    if maske != "auto" and maske not in range(8):
        raise QrFehler(f"Maske {maske!r} ungueltig (0..7 oder auto).")

    modus_id = modus_waehlen(text, modus)
    daten, benoetigte_bits = daten_codewoerter(text, version, ecc, modus_id)
    bloecke = bloecke_bilden(daten, version, ecc)
    # Erst die Codewoerter in BITS zerlegen, dann die Restbits anhaengen.
    # Die Restbits gehoeren HINTER die Codewortfolge, nicht als zusaetzliches
    # Codewort in die Folge hinein: sonst entstuenden 8 statt z. B. 7 Bit.
    bitfolge = bits_aus_codewoertern(interleaven(bloecke, version, ecc)) + restbit_folge(version)

    if len(bitfolge) != GESAMT_CODEWORTS[version] * 8 + RESTBITS[version]:
        raise QrFehler(
            f"Bitfolge hat {len(bitfolge)} Bit, erwartet "
            f"{GESAMT_CODEWORTS[version] * 8 + RESTBITS[version]} (Version {version})."
        )

    def bauen(maskennummer: int) -> Matrix:
        m = Matrix(version)
        funktionsmuster_setzen(m, ecc, maskennummer)
        daten_eintragen(m, bitfolge)
        maske_anwenden(m, maskennummer)
        format_info_setzen(m, ecc, maskennummer)  # Format-Info nach dem Maskieren
        return m

    if maske == "auto":
        bester = None
        beste_strafe = None
        for kandidat in range(8):
            m = bauen(kandidat)
            strafe = strafe_gesamt(m)
            if beste_strafe is None or strafe < beste_strafe:
                bester, beste_strafe = kandidat, strafe
        gewaehlte = bester
    else:
        gewaehlte = int(maske)

    m = bauen(gewaehlte)

    # Gegenprobe: die Matrix muss quadratisch sein und genau die Zellwerte 0/1
    # tragen. Ein einzelner Bytewert in einer Zelle wuerde die Zeilen verlaengern
    # und die Matrix stillschweigend unbrauchbar machen.
    matrix = ["".join("1" if zelle else "0" for zelle in zeile) for zeile in m.modul]
    kante = 17 + 4 * version
    if len(matrix) != kante or any(len(zeile) != kante for zeile in matrix):
        raise QrFehler(
            f"Erzeugte Matrix ist nicht {kante}x{kante} "
            f"({len(matrix)} Zeilen, laengste Zeile {max(len(z) for z in matrix)})."
        )
    if any(c not in "01" for zeile in matrix for c in zeile):
        raise QrFehler("Erzeugte Matrix enthaelt andere Zeichen als 0 und 1.")
    return matrix, gewaehlte, benoetigte_bits


def matrix_sha256(matrix: list[str]) -> str:
    """SHA256 ueber die UTF-8-Bytes von "\\n".join(matrix), ohne Schlussumbruch."""
    return hashlib.sha256("\n".join(matrix).encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# SVG-Ausgabe
# ---------------------------------------------------------------------------

def svg_schreiben(matrix: list[str], pfad: str, modul_px: int = 8, ruhezone: int = 4) -> None:
    """
    SVG schreiben: 1 Modul = 8 px, Ruhezone 4 Module, dunkel auf hell,
    shape-rendering="crispEdges".
    """
    n = len(matrix)
    kante = (n + 2 * ruhezone) * modul_px
    rand = ruhezone * modul_px
    teile = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{kante}" height="{kante}" '
        f'viewBox="0 0 {kante} {kante}" shape-rendering="crispEdges">',
        f'<rect width="{kante}" height="{kante}" fill="#ffffff"/>',
        '<g fill="#000000">',
    ]
    for z, zeile in enumerate(matrix):
        s = 0
        while s < n:
            if zeile[s] == "1":
                start = s
                while s < n and zeile[s] == "1":
                    s += 1
                breite = (s - start) * modul_px
                teile.append(
                    f'<rect x="{rand + start * modul_px}" y="{rand + z * modul_px}" '
                    f'width="{breite}" height="{modul_px}"/>'
                )
            else:
                s += 1
    teile.append('</g>')
    teile.append('</svg>')
    with open(pfad, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(teile) + "\n")


# ---------------------------------------------------------------------------
# Selbsttest
# ---------------------------------------------------------------------------

# Festgenagelte Pruefanker: erwartete SHA256 der Matrix je Fall.
#
# Diese Werte sind die Soll-Vorgabe fuer den Rust-Encoder: er muss fuer dieselbe
# Eingabe dieselbe Matrix und damit dieselbe Pruefsumme liefern. Sollte ein
# Anker durch eine bewusste Aenderung nicht mehr stimmen, MUSS er hier von Hand
# nachgezogen werden - der Selbsttest schlaegt sonst an (kein stilles Mitziehen).
FESTE_ANKER = {
    ("NL-4F7K-2Q", 1, "H", 0): "e61345fc37cf0f11108a181bf75e7cf9968abb9ecb50477d1d28c7b68bf735ae",
    ("NL-4F7K-2Q", 1, "H", "auto"): "6dd227a25977c08f2c5240d54dc33d824a9e0d35421ebec8077a0071ed78649e",
    ("NL-ABCD-12", 1, "L", 3): "afd72b63ca8ceb3a1b63899ada5fe6e8649be43f91a20bd8f420a60dc30a2017",
    ("HALLO WELT 1234", 2, "M", "auto"): "5fabb0499b1c37c118a68ac6e0b87e22d0c6e3b3388ac50b0057ae330e73376e",
    ("NL-ABCD-12", 2, "Q", 7): "34b9f0361a2bd85fd5d756da55e67a4e066522af50948a01f5a8b5765dac978f",
    ("HALLO WELT 1234", 3, "M", 1): "3fbe982d446236fdc8ea50e31a0d6ad16b6bf61610d65497a36c5cf950be63d1",
    ("NL-4F7K-2Q", 3, "H", "auto"): "14fbb75ef16b4455db406083387e02da06d6138bbb37e6b2113858fface21322",
    ("HALLO WELT 1234", 4, "L", 5): "838d48fd9077bc6fed06bb7e959682697bb7a82ce09eaeba16536392186f2f66",
    ("nl-4f7k-2q", 2, "H", 2): "5ee434437d69e632d139832d8223445f331b42c3cd362f0e764c7c68b214eeee",
    ("NL-ABCD-12", 4, "H", "auto"): "14cbde335f2d10fc48ba35665b2c9185218b912885ddaf7e9646b5d6bf84fad5",
}


def _faelle_fuer_selbsttest() -> list[dict]:
    """Prueffaelle: verschiedene Versionen, Stufen, Masken, beide Modi."""
    return [
        {"text": "NL-4F7K-2Q", "version": 1, "ecc": "H", "maske": 0},
        {"text": "NL-4F7K-2Q", "version": 1, "ecc": "H", "maske": "auto"},
        {"text": "NL-ABCD-12", "version": 1, "ecc": "L", "maske": 3},
        {"text": "HALLO WELT 1234", "version": 2, "ecc": "M", "maske": "auto"},
        {"text": "NL-ABCD-12", "version": 2, "ecc": "Q", "maske": 7},
        {"text": "HALLO WELT 1234", "version": 3, "ecc": "M", "maske": 1},
        {"text": "NL-4F7K-2Q", "version": 3, "ecc": "H", "maske": "auto"},
        {"text": "HALLO WELT 1234", "version": 4, "ecc": "L", "maske": 5},
        {"text": "nl-4f7k-2q", "version": 2, "ecc": "H", "maske": 2},   # Byte-Modus
        {"text": "NL-ABCD-12", "version": 4, "ecc": "H", "maske": "auto"},
    ]


def selbsttest() -> dict:
    """
    Pruefliste ausfuehren: Kodieren, Rueckkodieren mit dem Leser, Kapazitaetsgrenze.
    Rueckgabe: JSON-faehiges Ergebnis mit "ok".
    """
    faelle = []
    alles_ok = True

    # Den Leser laden, ohne dabei __pycache__ im Projektordner anzulegen.
    import importlib
    import os
    ordner = os.path.dirname(os.path.abspath(__file__))
    leser = None
    leser_fehler = None
    if os.path.exists(os.path.join(ordner, "qr_lesen.py")):
        alte_einstellung = sys.dont_write_bytecode
        sys.dont_write_bytecode = True
        try:
            if ordner not in sys.path:
                sys.path.insert(0, ordner)
            leser = importlib.import_module("qr_lesen")
        except Exception as exc:  # pragma: no cover
            leser_fehler = f"{type(exc).__name__}: {exc}"
            leser = None
        finally:
            sys.dont_write_bytecode = alte_einstellung
    else:
        leser_fehler = f"nicht gefunden: {os.path.join(ordner, 'qr_lesen.py')}"

    for fall in _faelle_fuer_selbsttest():
        eintrag = {
            "text": fall["text"],
            "version": fall["version"],
            "ecc": fall["ecc"],
            "maske_vorgabe": fall["maske"],
        }
        try:
            matrix, gewaehlte, nutzbits = matrix_erzeugen(
                fall["text"], fall["version"], fall["ecc"], fall["maske"]
            )
            eintrag["maske"] = gewaehlte
            eintrag["auto"] = fall["maske"] == "auto"
            eintrag["groesse"] = len(matrix)
            eintrag["sha256"] = matrix_sha256(matrix)
            eintrag["nutzbits"] = nutzbits
            eintrag["strafe"] = strafe_gesamt(_matrix_aus_text(matrix))

            # Formpruefung
            if len(matrix) != 17 + 4 * fall["version"]:
                raise QrFehler("Matrizengroesse falsch")
            if any(len(z) != len(matrix) for z in matrix):
                raise QrFehler("Matrix nicht quadratisch")
            if any(c not in "01" for z in matrix for c in z):
                raise QrFehler("Matrix enthaelt fremde Zeichen")

            # Pruefanker: die Matrix muss Bit fuer Bit die festgelegte sein
            schluessel = (fall["text"], fall["version"], fall["ecc"], fall["maske"])
            anker = FESTE_ANKER.get(schluessel)
            eintrag["anker"] = anker
            if anker is None:
                eintrag["anker_ok"] = False
                eintrag["anker_fehler"] = "kein Pruefanker hinterlegt"
                alles_ok = False
            else:
                eintrag["anker_ok"] = eintrag["sha256"] == anker
                if not eintrag["anker_ok"]:
                    eintrag["anker_fehler"] = (
                        f"Matrix weicht vom Anker ab: ist {eintrag['sha256']}, "
                        f"erwartet {anker}"
                    )
                    alles_ok = False

            # Rueckkodierung
            if leser is None:
                eintrag["rueckkodiert"] = None
                eintrag["rueckweg_ok"] = False
                eintrag["hinweis"] = f"Leser nicht nutzbar: {leser_fehler}"
                alles_ok = False
            else:
                ergebnis = leser.matrix_lesen(matrix)
                eintrag["rueckkodiert"] = ergebnis["text"]
                passt = (ergebnis["text"] == fall["text"]
                         and ergebnis["syndrome_ok"]
                         and ergebnis["version"] == fall["version"]
                         and ergebnis["ecc"] == fall["ecc"]
                         and ergebnis["maske"] == gewaehlte)
                eintrag["rueckweg_ok"] = passt
                eintrag["syndrome_ok"] = ergebnis["syndrome_ok"]
                if not passt:
                    alles_ok = False
            eintrag["ok"] = (bool(eintrag.get("rueckweg_ok", True))
                             and bool(eintrag.get("anker_ok", True))
                             and not eintrag.get("hinweis"))
        except Exception as exc:
            eintrag["ok"] = False
            eintrag["fehler"] = f"{type(exc).__name__}: {exc}"
            alles_ok = False
        faelle.append(eintrag)

    # --- Kapazitaetsgrenze Version 1 Stufe H, alphanumerisch ---
    grenze = {}
    try:
        letzte_gute = 0
        for laenge in range(1, 30):
            text = "A" * laenge
            try:
                matrix_erzeugen(text, 1, "H", 0, modus="alnum")
                letzte_gute = laenge
            except QrFehler:
                break
        grenze["v1_h_alnum_max"] = letzte_gute
        ueber = "A" * (letzte_gute + 1)
        try:
            matrix_erzeugen(ueber, 1, "H", 0, modus="alnum")
            grenze["abbruch_bei_11"] = False
            alles_ok = False
        except QrFehler as exc:
            grenze["abbruch_bei_11"] = True
            grenze["meldung"] = str(exc)
            grenze["rueckgabewert"] = 1
    except Exception as exc:  # pragma: no cover
        grenze["fehler"] = f"{type(exc).__name__}: {exc}"
        alles_ok = False

    # --- Byte-Modus-Grenzen (zur Information) ---
    byte_grenzen = {}
    for ecc in ECC_STUFEN:
        for version in VERSIONEN:
            letzte = 0
            for laenge in range(1, 200):
                try:
                    matrix_erzeugen("A" * laenge, version, ecc, 0, modus="byte")
                    letzte = laenge
                except QrFehler:
                    break
            byte_grenzen[f"v{version}_{ecc}_byte"] = letzte

    return {
        "ok": alles_ok,
        "faelle": faelle,
        "kapazitaet": grenze,
        "byte_grenzen": byte_grenzen,
    }


def _matrix_aus_text(matrix: list[str]) -> Matrix:
    """Hilfsfunktion: Zeichenkettenmatrix zurueck in ein Matrix-Objekt (nur Strafregeln)."""
    version = (len(matrix) - 17) // 4
    m = Matrix(version)
    for z, zeile in enumerate(matrix):
        for s, c in enumerate(zeile):
            m.modul[z][s] = 1 if c == "1" else 0
    return m


# ---------------------------------------------------------------------------
# Aufruf
# ---------------------------------------------------------------------------

def hauptprogramm(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="qr_referenz.py",
        description="QR Code Model 2 (ISO/IEC 18004) - Referenzencoder, nur Standardbibliothek.",
    )
    parser.add_argument("--text", help="Nutzlast (z. B. NL-4F7K-2Q)")
    parser.add_argument("--ecc", default="H", help="Fehlerkorrekturstufe L, M, Q oder H (Vorgabe H)")
    parser.add_argument("--version", type=int, default=1, help="Version 1..4 (Vorgabe 1)")
    parser.add_argument("--maske", default="auto", help="Maske 0..7 oder auto (Vorgabe auto)")
    parser.add_argument("--modus", default="auto", choices=("auto", "alnum", "byte"),
                        help="Modus erzwingen (Vorgabe auto)")
    parser.add_argument("--svg", help="Zusaetzlich ein SVG in diese Datei schreiben")
    parser.add_argument("--selbsttest", action="store_true", help="Pruefliste ausfuehren")
    args = parser.parse_args(argv)

    if args.selbsttest:
        ergebnis = selbsttest()
        json.dump(ergebnis, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0 if ergebnis["ok"] else 1

    if not args.text:
        sys.stderr.write(
            "qr_referenz.py: --text fehlt.\n"
            'Beispiel: python qr_referenz.py --text "NL-4F7K-2Q" --ecc H --version 1 --maske 0\n'
        )
        return 2

    ecc = args.ecc.upper()
    if ecc not in ECC_STUFEN:
        sys.stderr.write(f"qr_referenz.py: ECC-Stufe {args.ecc!r} unbekannt (L, M, Q, H).\n")
        return 2

    maske = args.maske.strip().lower()
    if maske == "auto":
        maske_wert = "auto"
    else:
        try:
            maske_wert = int(maske)
        except ValueError:
            sys.stderr.write(f"qr_referenz.py: --maske {args.maske!r} ungueltig (0..7 oder auto).\n")
            return 2
        if maske_wert not in range(8):
            sys.stderr.write(f"qr_referenz.py: --maske {maske_wert} ausserhalb 0..7.\n")
            return 2

    try:
        matrix, gewaehlte, _nutzbits = matrix_erzeugen(
            args.text, args.version, ecc, maske_wert, modus=args.modus
        )
    except QrFehler as exc:
        sys.stderr.write(f"qr_referenz.py: {exc}\n")
        return 1

    if args.svg:
        try:
            svg_schreiben(matrix, args.svg)
        except OSError as exc:
            sys.stderr.write(f"qr_referenz.py: SVG nicht schreibbar: {exc}\n")
            return 1

    ausgabe = {
        "text": args.text,
        "version": args.version,
        "ecc": ecc,
        "maske": gewaehlte,
        "auto": maske_wert == "auto",
        "groesse": len(matrix),
        "matrix": matrix,
        "sha256": matrix_sha256(matrix),
    }
    json.dump(ausgabe, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(hauptprogramm())
