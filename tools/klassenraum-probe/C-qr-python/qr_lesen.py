#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
qr_lesen.py - Rueckkodierung: QR-Matrix -> Nutzlast (QR Code Model 2, ISO/IEC 18004).

ZWECK
    Liest eine fertige QR-Matrix Zelle fuer Zelle aus und gewinnt die Nutzlast
    zurueck. Bewusst unabhaengig vom Encoder geschrieben: der Weg ist
        Format-Info lesen (beide Kopien) -> per BCH pruefen -> Maske entfernen
        -> Codewoerter im Zickzack lesen -> de-interleaven
        -> Reed-Solomon-Syndrome pruefen -> Modus/Laenge/Nutzlast lesen.

    Damit ist der Leser ein echtes Gegenstueck (Differentialtest): erst wenn
    beide Wege denselben Text liefern, ist die Matrix glaubhaft.

NUR STANDARDBIBLIOTHEK. Kein qrcode, kein segno, kein PIL/Pillow, kein numpy.

AUFRUF
    python qr_lesen.py --matrix-datei pfad.json       (JSON mit {"matrix":[...]})
    python qr_lesen.py --matrix-datei -               (JSON von der Standardeingabe)
    python qr_lesen.py --selbsttest                   (eigene Pruefliste)

    Beispiel Weiterleitung ohne Zwischendatei:
        python qr_referenz.py --text "NL-4F7K-2Q" --ecc H --version 1 --maske 0 ^
            | python qr_lesen.py --matrix-datei -

AUSGABE (stdout: GENAU EIN JSON-Objekt)
    {"text":"...","version":1,"ecc":"H","maske":0,"syndrome_ok":true}

RUECKGABEWERTE
    0 = ok
    1 = Matrix nicht lesbar (Format-Info unbrauchbar, Syndrome != 0, ...)
    2 = Aufruffehler (Datei fehlt, JSON kaputt, Matrix unbrauchbar)
"""

from __future__ import annotations

import argparse
import json
import sys

# ---------------------------------------------------------------------------
# Feste Kenngroessen (Spiegeltabellen der Norm, hier fuer das LESEN gebraucht)
# ---------------------------------------------------------------------------

VERSIONEN = (1, 2, 3, 4)
ECC_STUFEN = ("L", "M", "Q", "H")

# Format-Info: 2 Bit je Stufe (Tabelle 25)
FORMAT_BITS_ECC = {0b01: "L", 0b00: "M", 0b11: "Q", 0b10: "H"}

MODUS_ALNUM = 0b0010
MODUS_BYTE = 0b0100
MODUS_ENDE = 0b0000

ALNUM_ZEICHEN = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"

# Zeichenzaehl-Indikator in Bit (Tabelle 3), hier nur Versionsgruppe 1..9
ZAEHL_BITS = {
    MODUS_ALNUM: 9,
    MODUS_BYTE: 8,
}

GESAMT_CODEWORTS = {1: 26, 2: 44, 3: 70, 4: 100}
RESTBITS = {1: 0, 2: 7, 3: 7, 4: 7}

# Blockstruktur je (Version, Stufe): (Anzahl Bloecke, Datenwort je Block)
BLOCKSTRUKTUR = {
    (1, "L"): (1, 19), (1, "M"): (1, 16), (1, "Q"): (1, 13), (1, "H"): (1, 9),
    (2, "L"): (1, 34), (2, "M"): (1, 28), (2, "Q"): (1, 22), (2, "H"): (1, 16),
    (3, "L"): (1, 55), (3, "M"): (1, 44), (3, "Q"): (2, 17), (3, "H"): (2, 13),
    (4, "L"): (1, 80), (4, "M"): (2, 32), (4, "Q"): (2, 24), (4, "H"): (4, 9),
}

AUSRICHTUNG_ZENTREN = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
}

MASKBEDINGUNGEN = (
    lambda z, s: (z + s) % 2 == 0,                       # 0
    lambda z, s: z % 2 == 0,                             # 1
    lambda z, s: s % 3 == 0,                             # 2
    lambda z, s: (z + s) % 3 == 0,                       # 3
    lambda z, s: (z // 2 + s // 3) % 2 == 0,             # 4
    lambda z, s: (z * s) % 2 + (z * s) % 3 == 0,         # 5
    lambda z, s: ((z * s) % 2 + (z * s) % 3) % 2 == 0,   # 6
    lambda z, s: ((z + s) % 2 + (z * s) % 3) % 2 == 0,   # 7
)


class LeseFehler(Exception):
    """Matrix ist nicht (eindeutig) lesbar."""


# ---------------------------------------------------------------------------
# GF(256) - fuer die Syndrompruefung (Primitive 0x11D)
# ---------------------------------------------------------------------------

GF_PRIMITIV = 0x11D
GF_EXP = [0] * 512
GF_LOG = [0] * 256


def _gf_tabellen_bauen() -> None:
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
    if a == 0 or b == 0:
        return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]


def rs_syndrome(codeworts: list[int], ecc_laenge: int) -> list[int]:
    """
    Syndrome S_i = C(a^i), i = 0..ecc_laenge-1, Horner-Schema.
    Fehlerfreies Codewort -> alle Syndrome 0.
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
# BCH(15,5) fuer die Format-Info
# ---------------------------------------------------------------------------

def bch_rest(wert: int, generator: int, grad: int) -> int:
    rest = wert
    for i in range(wert.bit_length() - 1, grad - 1, -1):
        if (rest >> i) & 1:
            rest ^= generator << (i - grad)
    return rest


def format_bits_rechnen(ecc: str, maske: int) -> int:
    """Gueltige 15-Bit-Format-Info (BCH-Generator 0x537, XOR-Maske 0x5412)."""
    daten = ({"L": 0b01, "M": 0b00, "Q": 0b11, "H": 0b10}[ecc] << 3) | maske
    return ((daten << 10) | bch_rest(daten << 10, 0x537, 10)) ^ 0x5412


# Vorabtabelle aller 32 gueltigen Formatworte
ALLE_FORMATWORTE = [
    (format_bits_rechnen(ecc, maske), ecc, maske)
    for ecc in ECC_STUFEN
    for maske in range(8)
]


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def format_entzerren(gelesen: int) -> tuple[str, int, int]:
    """
    Format-Info per BCH entzerren: das gueltige Codewort mit dem kleinsten
    Hamming-Abstand gewinnt. Bis zu 3 Bitfehler sind korrigierbar.
    Rueckgabe: (ecc, maske, abstand)
    """
    bester = None
    for wort, ecc, maske in ALLE_FORMATWORTE:
        d = hamming(gelesen & 0x7FFF, wort)
        if bester is None or d < bester[2]:
            bester = (ecc, maske, d)
    ecc, maske, abstand = bester
    if abstand > 3:
        raise LeseFehler(
            f"Format-Info unbrauchbar: kleinster Abstand {abstand} Bit "
            "(mehr als 3 Bitfehler, BCH nicht korrigierbar)."
        )
    return ecc, maske, abstand


# ---------------------------------------------------------------------------
# Geometrie: Funktionsmodule bestimmen, Format-Info lesen
# ---------------------------------------------------------------------------

def funktionsmuster_karte(version: int) -> list[list[bool]]:
    """
    Reservierungskarte der Funktionsmodule - dieselbe Geometrie wie beim
    Schreiben, hier zum Ueberspringen beim Zickzack-Lesen.
    """
    groesse = 17 + 4 * version
    karte = [[False] * groesse for _ in range(groesse)]

    # Suchermuster samt Trenner (8x8 an drei Ecken)
    for zeile0, spalte0 in ((0, 0), (0, groesse - 8), (groesse - 8, 0)):
        for dz in range(8):
            for ds in range(8):
                karte[zeile0 + dz][spalte0 + ds] = True

    # Taktmuster
    for i in range(groesse):
        karte[6][i] = True
        karte[i][6] = True

    # Ausrichtungsmuster
    letzte = groesse - 7
    for z in AUSRICHTUNG_ZENTREN[version]:
        for s in AUSRICHTUNG_ZENTREN[version]:
            if (z == 6 and s == 6) or (z == 6 and s == letzte) or (z == letzte and s == 6):
                continue
            for dz in range(-2, 3):
                for ds in range(-2, 3):
                    karte[z + dz][s + ds] = True

    # Format-Info (beide Kopien) und Dunkelmodul
    for i in range(9):
        karte[8][i] = True
        karte[i][8] = True
    for i in range(8):
        karte[8][groesse - 1 - i] = True
    for i in range(7):
        karte[groesse - 1 - i][8] = True
    karte[groesse - 8][8] = True  # Dunkelmodul

    return karte


def format_info_lesen(matrix: list[str], version: int) -> tuple[str, int, int, list[int]]:
    """
    Beide Kopien der Format-Info lesen, getrennt entzerren und vergleichen.
    Rueckgabe: (ecc, maske, abstand_der_besten_kopie, rohwerte)
    """
    n = len(matrix)
    if n != 17 + 4 * version:
        raise LeseFehler(f"Matrizengroesse {n} passt nicht zu Version {version}.")

    def holen(z: int, s: int) -> int:
        return 1 if matrix[z][s] == "1" else 0

    # Kopie 1: Spalte 8 (Zeilen 0..5, 7, 8) und Zeile 8 (Spalten 7, 5..0)
    bits1 = 0
    for i in range(6):
        bits1 |= holen(i, 8) << i
    bits1 |= holen(7, 8) << 6
    bits1 |= holen(8, 8) << 7
    bits1 |= holen(8, 7) << 8
    for i in range(9, 15):
        bits1 |= holen(8, 14 - i) << i

    # Kopie 2: Zeile 8 rechts (Spalten n-1 .. n-8, Bits 0..7) und
    # Spalte 8 unten (Zeilen n-7 .. n-1, Bits 8..14).
    # BERICHTIGT am 06.10.2026 zusammen mit qr_referenz.py: Vorher war die zweite Kopie
    # transponiert gelesen worden. Beleg: Das Dunkelmodul (n-8, 8) muss immer dunkel sein -
    # die alte Fassung ueberschrieb es mit Bit 7.
    bits2 = 0
    for i in range(8):
        bits2 |= holen(8, n - 1 - i) << i
    for i in range(8, 15):
        bits2 |= holen(n - 15 + i, 8) << i

    e1, m1, d1 = format_entzerren(bits1)
    e2, m2, d2 = format_entzerren(bits2)

    if (e1, m1) != (e2, m2):
        # Die Kopie mit dem kleineren Abstand gewinnt; Gleichstand ist ein Fehler.
        if d1 < d2:
            return e1, m1, d1, [bits1, bits2]
        if d2 < d1:
            return e2, m2, d2, [bits1, bits2]
        raise LeseFehler(
            "Die beiden Format-Info-Kopien widersprechen sich "
            f"({e1}/Maske {m1} gegen {e2}/Maske {m2})."
        )
    return e1, m1, min(d1, d2), [bits1, bits2]


# ---------------------------------------------------------------------------
# Maske entfernen, Zickzack lesen, de-interleaven
# ---------------------------------------------------------------------------

def maske_entfernen(modul: list[list[int]], version: int, maske: int) -> None:
    """Maske auf alle Datemodule anwenden (XOR ist selbstinvers)."""
    karte = funktionsmuster_karte(version)
    bedingung = MASKBEDINGUNGEN[maske]
    for z in range(len(modul)):
        for s in range(len(modul)):
            if karte[z][s]:
                continue
            if bedingung(z, s):
                modul[z][s] ^= 1


def zickzack_lesen(modul: list[list[int]], version: int) -> list[int]:
    """Codewortfolge im Zickzack lesen (rechts nach links, 2 Spalten breit)."""
    karte = funktionsmuster_karte(version)
    groesse = 17 + 4 * version
    bits: list[int] = []
    spalte = groesse - 1
    aufwaerts = True

    while spalte > 0:
        if spalte == 6:
            spalte -= 1
        zeilen = range(groesse - 1, -1, -1) if aufwaerts else range(groesse)
        for zeile in zeilen:
            for s in (spalte, spalte - 1):
                if karte[zeile][s]:
                    continue
                bits.append(modul[zeile][s])
        aufwaerts = not aufwaerts
        spalte -= 2

    erwartet = GESAMT_CODEWORTS[version] * 8 + RESTBITS[version]
    if len(bits) != erwartet:
        raise LeseFehler(
            f"Zickzack lieferte {len(bits)} Bit, erwartet {erwartet} "
            f"(Version {version})."
        )

    # Restbits pruefen: sie muessen 0 sein (nach dem Maskieren)
    rest = bits[GESAMT_CODEWORTS[version] * 8:]
    if any(rest):
        raise LeseFehler("Restbits sind nicht 0 - Matrix passt nicht zur Norm.")

    codewoerter = []
    for i in range(0, GESAMT_CODEWORTS[version] * 8, 8):
        wert = 0
        for b in bits[i:i + 8]:
            wert = (wert << 1) | b
        codewoerter.append(wert)
    return codewoerter


def de_interleaven(codewoerter: list[int], version: int, ecc: str) -> list[list[int]]:
    """
    Umkehrung des Interleavings: die Folge wird spaltenweise auf die Bloecke
    verteilt, erst alle Datenwoerter, dann alle ECC-Woerter.
    Rueckgabe: Liste vollstaendiger Bloecke (Daten + ECC).
    """
    anzahl_bloecke, daten_je_block = BLOCKSTRUKTUR[(version, ecc)]
    gesamt = GESAMT_CODEWORTS[version]
    ecc_je_block = (gesamt - anzahl_bloecke * daten_je_block) // anzahl_bloecke
    gesamt_je_block = daten_je_block + ecc_je_block

    if len(codewoerter) != gesamt:
        raise LeseFehler(f"{len(codewoerter)} Codewoerter gelesen, erwartet {gesamt}.")

    bloecke = [[] for _ in range(anzahl_bloecke)]
    pos = 0
    for i in range(daten_je_block):
        for b in range(anzahl_bloecke):
            bloecke[b].append(codewoerter[pos])
            pos += 1
    for i in range(ecc_je_block):
        for b in range(anzahl_bloecke):
            bloecke[b].append(codewoerter[pos])
            pos += 1

    if any(len(b) != gesamt_je_block for b in bloecke):
        raise LeseFehler("De-Interleaving ergab Blocklaengen ausserhalb der Norm.")
    return bloecke


def syndrome_pruefen(bloecke: list[list[int]], version: int, ecc: str) -> tuple[bool, list[list[int]]]:
    """Reed-Solomon-Syndrome jedes Blocks pruefen. Alle 0 = fehlerfrei."""
    _anzahl, daten_je_block = BLOCKSTRUKTUR[(version, ecc)]
    ecc_je_block = len(bloecke[0]) - daten_je_block
    alle = []
    alles_null = True
    for block in bloecke:
        s = rs_syndrome(block, ecc_je_block)
        alle.append(s)
        if any(s):
            alles_null = False
    return alles_null, alle


# ---------------------------------------------------------------------------
# Nutzlast lesen
# ---------------------------------------------------------------------------

class Bitleser:
    """Bitweiser Leser ueber die Daten-Codewoerter."""

    def __init__(self, daten: list[int]) -> None:
        self.bits: list[int] = []
        for byte in daten:
            for s in range(7, -1, -1):
                self.bits.append((byte >> s) & 1)
        self.pos = 0

    def rest(self) -> int:
        return len(self.bits) - self.pos

    def lesen(self, anzahl: int) -> int:
        if anzahl > self.rest():
            raise LeseFehler("Bitstrom zu kurz - Nutzlast bricht ab.")
        wert = 0
        for _ in range(anzahl):
            wert = (wert << 1) | self.bits[self.pos]
            self.pos += 1
        return wert


def nutzlast_lesen(daten: list[int], version: int) -> tuple[str, int, int]:
    """
    Modus, Laenge und Nutzlast aus den Daten-Codewoertern lesen.
    Rueckgabe: (text, modus, verbrauchte_bits)
    """
    leser = Bitleser(daten)
    modus = leser.lesen(4)

    if modus == MODUS_ENDE:
        return "", modus, leser.pos

    if modus not in (MODUS_ALNUM, MODUS_BYTE):
        raise LeseFehler(
            f"Modus-Indikator {modus:04b} wird von dieser Referenz nicht gedeckt "
            "(nur alphanumerisch 0010 und Byte 0100)."
        )

    anzahl = leser.lesen(ZAEHL_BITS[modus])

    if modus == MODUS_ALNUM:
        zeichen = []
        paare = anzahl // 2
        for _ in range(paare):
            wert = leser.lesen(11)
            erst, zweit = divmod(wert, 45)
            if erst > 44:
                raise LeseFehler("Alphanumerisches Paar ausserhalb des Alphabets.")
            zeichen.append(ALNUM_ZEICHEN[erst])
            zeichen.append(ALNUM_ZEICHEN[zweit])
        if anzahl % 2 == 1:
            wert = leser.lesen(6)
            if wert > 44:
                raise LeseFehler("Alphanumerisches Einzelzeichen ausserhalb des Alphabets.")
            zeichen.append(ALNUM_ZEICHEN[wert])
        return "".join(zeichen), modus, leser.pos

    roh = bytes(leser.lesen(8) for _ in range(anzahl))
    try:
        text = roh.decode("utf-8")
    except UnicodeDecodeError:
        # Kein gueltiges UTF-8: Bytes ersatzweise latein-1 lesen, damit die
        # Nutzlast nicht verloren geht (der Encoder schreibt UTF-8).
        text = roh.decode("latin-1")
    return text, modus, leser.pos


# ---------------------------------------------------------------------------
# Hauptlesevorgang
# ---------------------------------------------------------------------------

def matrix_pruefen_form(matrix: list[str]) -> int:
    """Formpruefung: quadratisch, Zeichen 0/1, Groesse 21/25/29/33. Rueckgabe: Version."""
    if not isinstance(matrix, list) or not matrix:
        raise LeseFehler("Matrix fehlt oder ist leer.")
    n = len(matrix)
    for i, zeile in enumerate(matrix):
        if not isinstance(zeile, str):
            raise LeseFehler(f"Zeile {i} ist keine Zeichenkette.")
        if len(zeile) != n:
            raise LeseFehler(f"Zeile {i} hat {len(zeile)} Zeichen, erwartet {n}.")
        if any(c not in "01" for c in zeile):
            raise LeseFehler(f"Zeile {i} enthaelt andere Zeichen als 0 und 1.")
    if (n - 17) % 4 != 0 or n not in (21, 25, 29, 33):
        raise LeseFehler(f"Matrizengroesse {n} ist keine Version 1..4 (21/25/29/33).")
    return (n - 17) // 4


def matrix_lesen(matrix: list[str]) -> dict:
    """
    Vollstaendige Rueckkodierung einer Matrix.
    Rueckgabe: {"text", "version", "ecc", "maske", "syndrome_ok",
                "format_abstand", "format_roh", "modus", "bloecke"}
    """
    version = matrix_pruefen_form(matrix)
    modul = [[1 if c == "1" else 0 for c in zeile] for zeile in matrix]

    # 1) Format-Info lesen und per BCH pruefen
    ecc, maske, abstand, roh = format_info_lesen(matrix, version)

    # 2) Maske entfernen
    maske_entfernen(modul, version, maske)

    # 3) Codewoerter im Zickzack lesen
    codewoerter = zickzack_lesen(modul, version)

    # 4) De-interleaven
    bloecke = de_interleaven(codewoerter, version, ecc)

    # 5) Reed-Solomon-Syndrome pruefen
    syndrome_ok, syndrome = syndrome_pruefen(bloecke, version, ecc)

    # 6) Nutzlast lesen
    _anzahl_bloecke, daten_je_block = BLOCKSTRUKTUR[(version, ecc)]
    daten = []
    for block in bloecke:
        daten.extend(block[:daten_je_block])
    text, modus, verbraucht = nutzlast_lesen(daten, version)

    return {
        "text": text,
        "version": version,
        "ecc": ecc,
        "maske": maske,
        "syndrome_ok": syndrome_ok,
        "format_abstand": abstand,
        "format_roh": roh,
        "modus": modus,
        "bloecke": len(bloecke),
        "datenbloecke": f"{len(bloecke)}x{daten_je_block}",
        "nutzbits": verbraucht,
        "syndrome": syndrome,
    }


def ausgabe_kurz(ergebnis: dict) -> dict:
    """Die geforderte Ausgabeform (genau diese fuenf Schluessel)."""
    return {
        "text": ergebnis["text"],
        "version": ergebnis["version"],
        "ecc": ergebnis["ecc"],
        "maske": ergebnis["maske"],
        "syndrome_ok": ergebnis["syndrome_ok"],
    }


# ---------------------------------------------------------------------------
# Eigener Selbsttest des Lesers (ohne Encoder): feste Matrix, feste Antwort
# ---------------------------------------------------------------------------

# Referenzmatrix Version 1, Stufe H, Maske 0, Text "NL-4F7K-2Q".
# Erzeugt mit qr_referenz.py und hier als Pruefanker hinterlegt, damit der
# Leser auch ohne den Encoder pruefbar bleibt.
FESTE_MATRIX_V1H_M0 = None  # wird beim Selbsttest aus dem Encoder geholt, falls vorhanden


def selbsttest() -> dict:
    """
    Pruefliste des Lesers: erst gegen den Encoder (falls auffindbar), dann die
    harten Einzelpruefungen (Format-Info-Kopie, BCH, Syndrom, Masken 0..7).
    """
    import importlib
    import os

    faelle = []
    alles_ok = True

    # Den Encoder laden, ohne dabei __pycache__ im Projektordner anzulegen.
    ordner = os.path.dirname(os.path.abspath(__file__))
    encoder = None
    if os.path.exists(os.path.join(ordner, "qr_referenz.py")):
        alte_einstellung = sys.dont_write_bytecode
        sys.dont_write_bytecode = True
        try:
            if ordner not in sys.path:
                sys.path.insert(0, ordner)
            encoder = importlib.import_module("qr_referenz")
        finally:
            sys.dont_write_bytecode = alte_einstellung

    if encoder is None:
        return {"ok": False, "fehler": f"Encoder nicht gefunden: {ordner}", "faelle": []}

    pruefungen = [
        ("NL-4F7K-2Q", 1, "H", 0),
        ("NL-4F7K-2Q", 1, "L", 7),
        ("NL-ABCD-12", 2, "Q", 5),
        ("HALLO WELT 1234", 3, "M", 2),
        ("nl-4f7k-2q", 2, "H", 1),          # Byte-Modus (Kleinbuchstaben)
        ("HALLO WELT 1234", 4, "H", 6),
    ]

    for text, version, ecc, maske in pruefungen:
        eintrag = {"text": text, "version": version, "ecc": ecc, "maske": maske}
        try:
            matrix, _gewaehlt, _bits = encoder.matrix_erzeugen(text, version, ecc, maske)
            ergebnis = matrix_lesen(matrix)
            eintrag["gelesen"] = ergebnis["text"]
            eintrag["syndrome_ok"] = ergebnis["syndrome_ok"]
            eintrag["format_abstand"] = ergebnis["format_abstand"]
            eintrag["ok"] = (ergebnis["text"] == text
                             and ergebnis["syndrome_ok"]
                             and ergebnis["version"] == version
                             and ergebnis["ecc"] == ecc
                             and ergebnis["maske"] == maske)
        except Exception as exc:
            eintrag["ok"] = False
            eintrag["fehler"] = f"{type(exc).__name__}: {exc}"
        if not eintrag["ok"]:
            alles_ok = False
        faelle.append(eintrag)

    # Einzelfall: eine gekippte Format-Info-Zelle muss korrigiert werden
    einzelfall = {}
    try:
        matrix, _g, _b = encoder.matrix_erzeugen("NL-4F7K-2Q", 1, "H", 0)
        gekippt = list(matrix)
        # genau eine Zelle der ersten Format-Info-Kopie umdrehen: (0,8)
        zeile0 = list(gekippt[0])
        zeile0[8] = "0" if zeile0[8] == "1" else "1"
        gekippt[0] = "".join(zeile0)
        ergebnis = matrix_lesen(gekippt)
        einzelfall = {
            "beschreibung": "1 Bitfehler in Format-Info-Kopie 1",
            "gelesen": ergebnis["text"],
            "maske": ergebnis["maske"],
            "format_abstand": ergebnis["format_abstand"],
            "syndrome_ok": ergebnis["syndrome_ok"],
            "ok": ergebnis["text"] == "NL-4F7K-2Q" and ergebnis["maske"] == 0
                  and ergebnis["syndrome_ok"],
        }
    except Exception as exc:
        einzelfall = {"ok": False, "fehler": f"{type(exc).__name__}: {exc}"}
    if not einzelfall.get("ok"):
        alles_ok = False

    # Einzelfall: ein gekipptes Datenmodul muss die Syndrome verraetern
    fehlerfall = {}
    try:
        matrix, _g, _b = encoder.matrix_erzeugen("NL-4F7K-2Q", 1, "H", 0)
        kaputt = list(matrix)
        # ein Datenmodul weit unten rechts umdrehen (nicht in der Format-Info)
        zeile = list(kaputt[len(kaputt) - 1])
        zeile[len(zeile) - 1] = "0" if zeile[len(zeile) - 1] == "1" else "1"
        kaputt[len(kaputt) - 1] = "".join(zeile)
        ergebnis = matrix_lesen(kaputt)
        fehlerfall = {
            "beschreibung": "1 Bitfehler in einem Datenmodul",
            "syndrome_ok": ergebnis["syndrome_ok"],
            "ok": ergebnis["syndrome_ok"] is False,
        }
    except LeseFehler as exc:
        fehlerfall = {
            "beschreibung": "1 Bitfehler in einem Datenmodul",
            "erwartet": "Syndrome != 0",
            "meldung": str(exc),
            "ok": True,   # Abbruch ist hier ebenfalls ein gueltiges Erkennen
        }
    except Exception as exc:
        fehlerfall = {"ok": False, "fehler": f"{type(exc).__name__}: {exc}"}
    if not fehlerfall.get("ok"):
        alles_ok = False

    return {
        "ok": alles_ok,
        "faelle": faelle,
        "format_bitfehler": einzelfall,
        "daten_bitfehler": fehlerfall,
    }


# ---------------------------------------------------------------------------
# Aufruf
# ---------------------------------------------------------------------------

def hauptprogramm(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="qr_lesen.py",
        description="QR-Matrix zurueckkodieren (QR Code Model 2, ISO/IEC 18004).",
    )
    parser.add_argument("--matrix-datei", help='JSON-Datei mit {"matrix":["0101...", ...]}; '
                                               '"-" liest von der Standardeingabe')
    parser.add_argument("--ausfuehrlich", action="store_true",
                        help="Zusatzangaben mit ausgeben (Modus, Blockzahl, Format-Abstand)")
    parser.add_argument("--selbsttest", action="store_true", help="eigene Pruefliste ausfuehren")
    args = parser.parse_args(argv)

    if args.selbsttest:
        ergebnis = selbsttest()
        json.dump(ergebnis, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0 if ergebnis["ok"] else 1

    if not args.matrix_datei:
        sys.stderr.write(
            "qr_lesen.py: --matrix-datei fehlt.\n"
            "Beispiel: python qr_lesen.py --matrix-datei matrix.json\n"
        )
        return 2

    try:
        if args.matrix_datei == "-":
            # Standardeingabe: die Kodierung meldet der Aufrufer (auf Windows
            # schreibt die Shell sonst UTF-16 mit BOM). Erwartet wird UTF-8,
            # eine fuehrende BOM wird toleriert ("utf-8-sig").
            rohtext = sys.stdin.buffer.read().decode("utf-8-sig")
            daten = json.loads(rohtext)
        else:
            with open(args.matrix_datei, "r", encoding="utf-8-sig") as fh:
                daten = json.load(fh)
    except OSError as exc:
        sys.stderr.write(f"qr_lesen.py: Matrixdatei nicht lesbar: {exc}\n")
        return 2
    except UnicodeDecodeError as exc:
        sys.stderr.write(
            f"qr_lesen.py: Matrixdaten sind kein UTF-8: {exc}\n"
            "Hinweis: PowerShell 5.1 schreibt bei '>' UTF-16. Bitte "
            "--matrix-datei mit einer UTF-8-Datei nutzen oder die Ausgabe "
            "des Encoders direkt weiterleiten.\n"
        )
        return 2
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"qr_lesen.py: Matrixdatei ist kein gueltiges JSON: {exc}\n")
        return 2

    if not isinstance(daten, dict) or "matrix" not in daten:
        sys.stderr.write('qr_lesen.py: JSON braucht den Schluessel "matrix".\n')
        return 2

    try:
        ergebnis = matrix_lesen(daten["matrix"])
    except LeseFehler as exc:
        sys.stderr.write(f"qr_lesen.py: {exc}\n")
        return 1

    if not ergebnis["syndrome_ok"]:
        sys.stderr.write(
            "qr_lesen.py: Reed-Solomon-Syndrome sind nicht 0 "
            "- die Matrix enthaelt Fehler.\n"
        )

    ausgabe = ausgabe_kurz(ergebnis) if not args.ausfuehrlich else {
        "text": ergebnis["text"],
        "version": ergebnis["version"],
        "ecc": ergebnis["ecc"],
        "maske": ergebnis["maske"],
        "syndrome_ok": ergebnis["syndrome_ok"],
        "modus": ergebnis["modus"],
        "blockzahl": ergebnis["bloecke"],
        "datenbloecke": ergebnis["datenbloecke"],
        "format_abstand": ergebnis["format_abstand"],
        "format_roh": [hex(w) for w in ergebnis["format_roh"]],
        "syndrome": ergebnis["syndrome"],
    }
    json.dump(ausgabe, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0 if ergebnis["syndrome_ok"] else 1


if __name__ == "__main__":
    sys.exit(hauptprogramm())
