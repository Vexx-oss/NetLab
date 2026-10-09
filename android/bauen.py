"""Android-App (APK) aus dem Netzwerk-Labor bauen.

Warum ohne Gradle: Das Projekt hat keinen Paketmanager, keinen Bundler und keine
Abhängigkeiten — die Web-Fassung ist eine einzige HTML-Datei. Gradle würde dafür
mehrere hundert MB Werkzeug und ein Abhängigkeitsverzeichnis nachladen. Die
SDK-Werkzeuge (aapt2, javac, d8, zipalign, apksigner) tun dasselbe in fünf Schritten
und sind nachvollziehbar.

Ablauf:
  1. python bauen.py                     -> web/index.html
  2. python tools/einfach.py --ziel …    -> EINE Datei, 0 Außenverweise
  3. android/mobil/{mobil.css,mobil.js} einhängen  -> bau/assets/index.html
  4. aapt2 compile/link (Manifest, Ressourcen, Assets)  -> bau/base.apk
  5. javac + d8                          -> bau/dex/classes.dex
  6. classes.dex in die APK legen, zipalign, apksigner signieren
  7. prüfen (Signatur, badging, Drehung im Manifest und im Bytecode, Assets byte-gleich)
     -> Programm/Netzwerk-Labor-<Version>-Android.apk

Voraussetzungen: Android-SDK (build-tools ≥ 35 und eine Plattform mit android.jar),
JDK 17+ (javac, keytool), Python mit Pillow (nur fürs Symbol).

Aufruf:
    python android/bauen.py                    # alles bauen
    python android/bauen.py --ohne-spiel       # Web-Fassung nicht neu bauen (schnell)
    python android/bauen.py --sdk D:\\android-sdk
    python android/bauen.py --ziel wo/anders.apk
"""
import argparse
import hashlib
import os
import re
import secrets
import shutil
import subprocess
import sys
import textwrap
import zipfile
from pathlib import Path

# Die Werkzeuge (keytool, javac) schreiben auf Deutsch mit Umlauten. Ohne das hier
# bricht das Mitschreiben auf einer cp1252-Konsole mit UnicodeEncodeError ab
# (gemessen 06.10.2026, keytool-Ausgabe).
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HIER = Path(__file__).resolve().parent          # …/Netzwerk-Labor/android
PROJEKT = HIER.parent                           # …/Netzwerk-Labor
BAU = HIER / "bau"
HUELLE = HIER / "huelle"
MOBIL = HIER / "mobil"
SIGNATUR = HIER / "signatur"
PROGRAMM = PROJEKT / "Programm"

MIN_SDK = 24
ZIEL_SDK = 34
PAKET = "oss.vexx.netlab"

# versionCode der Android-Fassung. Er MUSS bei jeder veröffentlichten APK steigen:
# Android verweigert die Installation über eine alte Fassung, wenn der Code nicht
# größer ist („App nicht installiert“). versionName folgt der Spielversion aus
# bauen.py (VERSION), der Code ist eine eigene Bauzählung.
# Herleitung: 1*10000 + 2*100 + 4 = 10204 für die Spielversion 1.2.4.
# Angehoben am 07.10.2026 mit dem Fassungszug 1.2.3 → 1.2.4: 10203 wäre kleiner als der
# aus 1.2.4 abgeleitete Wert und der Bau bräche ab (android/bauen.py, version_lesen).
# Angehoben am 09.10.2026 mit dem Fassungszug 1.2.4 → 2.0.0: version_lesen leitet aus
# versionName 2.0.0 den Wert 2*10000 + 0*100 + 0 = 20000 ab und bricht bei
# `VERSION_CODE < abgeleitet` ab. 20001 liegt genau eine Bauzählung darüber.
# Angehoben am 09.10.2026 mit dem Fassungszug 2.0.0 → 2.0.1: abgeleitet wird jetzt
# 2*10000 + 0*100 + 1 = 20001; die Hausregel verlangt einen Wert DARÜBER (nicht gleich),
# damit eine APK mit gleichem versionName aber neuerem Bau installierbar bleibt → 20002.
VERSION_CODE = 20003

SDK_ORTE = [
    Path(r"C:\Users\Student\android-sdk"),
    Path(os.environ.get("LOCALAPPDATA", "")) / "Android" / "Sdk",
    Path(os.environ.get("USERPROFILE", "")) / "Android" / "Sdk",
]


# ---------------------------------------------------------------- Werkzeuge finden

def _versionsteile(name: str):
    zahlen = re.findall(r"\d+", name)
    return tuple(int(z) for z in zahlen) if zahlen else (0,)


def build_tools_waehlen(sdk: Path) -> str:
    """Höchste vorhandene build-tools nehmen.

    Gemessen 06.10.2026: `d8` aus **build-tools 34.0.0** (D8 8.2.2-dev) bricht bei
    JEDER verschachtelten Klasse mit einer internen NullPointerException ab
    („Cannot invoke String.length() because … is null“). Nachgestellt mit drei Zeilen
    Java (`class A extends Activity { void x(){ new Runnable(){ public void run(){} }; } }`):
    build-tools 34.0.0 → Absturz, build-tools 36.0.0 (D8 8.10.9-dev) → classes.dex.
    Eine Klasse ohne Verschachtelung übersetzt auch 34.0.0. Deshalb: höchste Fassung.
    """
    ordner = sdk / "build-tools"
    if not ordner.is_dir():
        raise SystemExit(f"FEHLER: {ordner} fehlt — SDK unvollständig.")
    da = sorted((d for d in ordner.iterdir() if d.is_dir()), key=lambda d: _versionsteile(d.name))
    if not da:
        raise SystemExit(f"FEHLER: keine build-tools in {ordner}.")
    gewaehlt = da[-1]
    if _versionsteile(gewaehlt.name) < (35,):
        raise SystemExit(
            f"FEHLER: nur build-tools {gewaehlt.name} gefunden — deren d8 bricht bei\n"
            "  verschachtelten Klassen ab (gemessen mit 34.0.0). Abhilfe:\n"
            '    sdkmanager "build-tools;36.0.0"'
        )
    return f"build-tools/{gewaehlt.name}"


def plattform_waehlen(sdk: Path) -> str:
    ordner = sdk / "platforms"
    da = sorted((d for d in ordner.iterdir() if d.is_dir() and (d / "android.jar").is_file()),
                key=lambda d: _versionsteile(d.name)) if ordner.is_dir() else []
    if not da:
        raise SystemExit(f"FEHLER: keine Plattform mit android.jar in {ordner}.")
    return f"platforms/{da[-1].name}"


def sdk_finden(argument):
    def passt(p: Path) -> bool:
        return (p / "build-tools").is_dir() and (p / "platforms").is_dir()

    if argument:
        p = Path(argument).expanduser().resolve()
        if not passt(p):
            raise SystemExit(f"FEHLER: in {p} fehlen build-tools/ oder platforms/.")
        return p
    for name in ("ANDROID_SDK_ROOT", "ANDROID_HOME"):
        if os.environ.get(name) and passt(Path(os.environ[name])):
            return Path(os.environ[name])
    for p in SDK_ORTE:
        if p and passt(p):
            return p
    raise SystemExit(
        "FEHLER: kein Android-SDK gefunden.\n"
        f"  gesucht in: {', '.join(str(p) for p in SDK_ORTE)}\n"
        "  Abhilfe:  --sdk <Pfad>  oder  ANDROID_SDK_ROOT setzen.\n"
        "  Einrichten (portabel, ohne Installer):\n"
        "    cmdline-tools entpacken nach <SDK>/cmdline-tools/latest, dann\n"
        '    sdkmanager "platform-tools" "platforms;android-34" "build-tools;36.0.0"'
    )


def java_finden():
    for name in ("JAVA_HOME", "JDK_HOME"):
        if os.environ.get(name):
            kandidat = Path(os.environ[name]) / "bin" / ("java.exe" if os.name == "nt" else "java")
            if kandidat.is_file():
                return kandidat
    treffer = shutil.which("java")
    if treffer:
        return Path(treffer)
    raise SystemExit("FEHLER: kein java gefunden. JDK 17+ installieren oder JAVA_HOME setzen.")


class Werkzeuge:
    """Alle Pfade an einer Stelle — damit keine Funktion die SDK-Ordnung errät."""

    def __init__(self, sdk: Path):
        self.sdk = sdk
        self.java = java_finden()
        self.build_tools = build_tools_waehlen(sdk)
        self.plattform = plattform_waehlen(sdk)
        self.android_jar = sdk / self.plattform / "android.jar"
        self._exe = ".exe" if os.name == "nt" else ""
        self.aapt2 = sdk / self.build_tools / ("aapt2" + self._exe)
        self.zipalign = sdk / self.build_tools / ("zipalign" + self._exe)
        self.dexdump = sdk / self.build_tools / ("dexdump" + self._exe)
        self.d8 = sdk / self.build_tools / ("d8.bat" if os.name == "nt" else "d8")
        self.apksigner = sdk / self.build_tools / "lib" / "apksigner.jar"
        self.javac = self.java.parent / ("javac" + self._exe)
        if not self.javac.is_file():
            self.javac = Path(shutil.which("javac") or "javac")
        self.keytool = self.java.parent / ("keytool" + self._exe)
        if not self.keytool.is_file():
            self.keytool = Path(shutil.which("keytool") or "keytool")

    def beschreiben(self):
        print(f"  SDK         {self.sdk}")
        print(f"  build-tools {self.build_tools.split('/')[-1]}")
        print(f"  Plattform   {self.plattform.split('/')[-1]}")
        print(f"  Java        {self.java}")


# ---------------------------------------------------------------- Hilfen

def lauf(befehl, still=False, geheim=None):
    """Externen Befehl ausführen und bei Fehlschlag mit vollem Text abbrechen.

    `geheim` wird in der mitgeschriebenen Befehlszeile durch *** ersetzt: der
    Signaturschlüssel darf nicht im Protokoll stehen.
    """
    zeige = " ".join(f'"{b}"' if " " in str(b) else str(b) for b in befehl)
    if geheim:
        zeige = zeige.replace(str(geheim), "***")
    if not still:
        print("  $ " + zeige)
    r = subprocess.run([str(b) for b in befehl], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    for strom in (r.stdout, r.stderr):
        if strom and strom.strip() and not still:
            print(textwrap.indent(strom.strip(), "      "))
    if r.returncode != 0:
        raise SystemExit(f"FEHLER: {befehl[0]} ist gescheitert (Rückgabewert {r.returncode}).\n"
                         f"  Befehl: {zeige}")
    return r


def version_lesen():
    """versionName aus bauen.py lesen — EINE Quelle der Wahrheit, kein zweiter Stand.

    versionCode kommt bewusst NICHT aus derselben Rechnung, sondern steht als
    VERSION_CODE oben (Begründung dort): er ist eine Bauzählung, versionName ist die
    Spielversion. Geprüft wird nur, dass der Code nicht unter dem aus versionName
    ableitbaren Wert liegt — sonst ließe sich die APK nicht über die alte legen.
    """
    text = (PROJEKT / "bauen.py").read_text(encoding="utf-8")
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', text, re.M)
    if not m:
        raise SystemExit("FEHLER: VERSION in bauen.py nicht gefunden.")
    version = m.group(1)
    zahlen = [int(x) for x in re.findall(r"\d+", version)][:3]
    while len(zahlen) < 3:
        zahlen.append(0)
    abgeleitet = zahlen[0] * 10000 + zahlen[1] * 100 + zahlen[2]
    if VERSION_CODE < abgeleitet:
        raise SystemExit(
            f"FEHLER: versionCode {VERSION_CODE} ist kleiner als der aus versionName\n"
            f"  {version} ableitbare Wert {abgeleitet} — Android lehnt das ab.\n"
            "  VERSION_CODE in android/bauen.py erhöhen.")
    return version, VERSION_CODE


def einfuegen(html: str, marke: str, text: str) -> str:
    """Text unmittelbar vor `marke` einsetzen — an der RICHTIGEN Stelle.

    Gemessen 06.10.2026: `</head>` kommt in der gebauten Seite **zweimal** vor. Das Spiel
    liefert einer Attrappe-Webseite im Labor eine HTML-Vorlage als Zeichenkette mit
    (`H.seite = (host, ip) => '<!DOCTYPE html>…</head>…'`). Eine Prüfung auf „genau 1×“
    bricht deshalb ab. Die Stelle wird darum benannt statt gezählt:
      * `</head>`  — das erste, und zwar VOR `<body>`.
      * `</body>`  — das letzte, und zwar am Dateiende (dort endet das Dokument).
    """
    if marke == "</head>":
        i = html.find(marke)
        koerper = html.find("<body")
        if i == -1 or koerper == -1 or i > koerper:
            raise SystemExit("FEHLER: kein echtes </head> vor <body> gefunden.")
    else:
        i = html.rfind(marke)
        if i == -1 or len(html) - i > 400:
            raise SystemExit("FEHLER: kein </body> am Dateiende gefunden.")
    return html[:i] + text + html[i:]


# ---------------------------------------------------------------- Bau-Schritte

def spiel_bauen():
    """web/index.html und daraus die Einzeldatei bauen."""
    print("1) Spiel bauen")
    lauf([sys.executable, str(PROJEKT / "bauen.py")])
    einzel = BAU / "spiel.html"
    BAU.mkdir(parents=True, exist_ok=True)
    lauf([sys.executable, str(PROJEKT / "tools" / "einfach.py"), "--ziel", str(einzel)])
    return einzel


def mobil_einbetten(quelle: Path, ziel: Path):
    """Android-Anpassung (mobil.css/mobil.js) in die Einzeldatei einhängen.

    Die Quellen in src/ bleiben unangetastet: die Anpassung gilt nur für die App.
    """
    print("2) Android-Anpassung einhängen")
    html = quelle.read_text(encoding="utf-8")
    css = (MOBIL / "mobil.css").read_text(encoding="utf-8").replace("\r\n", "\n")
    js = (MOBIL / "mobil.js").read_text(encoding="utf-8").replace("\r\n", "\n").replace("</script", "<\\/script")

    html = einfuegen(html, "</head>", "<style>\n" + css + "\n</style>\n")
    html = einfuegen(html, "</body>", "<script>\n" + js + "\n</script>\n")

    for verboten, name in ((r"<link[^>]+stylesheet", "externes CSS"),
                           (r"<script[^>]+src=", "externes Skript"),
                           (r"""url\(\s*["']?(?!data:)[^)"']+\.(woff2?|ttf|otf)""", "externe Schrift")):
        if re.search(verboten, html, re.I):
            raise SystemExit(f"FEHLER: nach dem Einhängen steckt {name} in der Seite.")

    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(html, encoding="utf-8", newline="\n")
    roh = ziel.read_bytes()
    print(f"   {ziel.relative_to(PROJEKT)}  {len(roh):,} Bytes  SHA256 {hashlib.sha256(roh).hexdigest()[:16]}…")
    print(f"   eingehängt: mobil.css {len(css):,} B, mobil.js {len(js):,} B")
    return ziel


def ikonen():
    if not (HUELLE / "res" / "mipmap-xxxhdpi" / "ic_launcher.png").is_file():
        print("3) App-Symbol erzeugen")
        lauf([sys.executable, str(HIER / "werkzeuge" / "ikone.py")])


def version_in_java(version):
    """__VERSION__ in MainActivity.java ersetzen (Kopie in bau/, Quelle bleibt sauber)."""
    ziel = BAU / "java" / "oss" / "vexx" / "netlab" / "MainActivity.java"
    ziel.parent.mkdir(parents=True, exist_ok=True)
    text = (HUELLE / "src" / "oss" / "vexx" / "netlab" / "MainActivity.java").read_text(encoding="utf-8")
    if "__VERSION__" not in text:
        raise SystemExit("FEHLER: __VERSION__ fehlt in MainActivity.java.")
    ziel.write_text(text.replace("__VERSION__", version), encoding="utf-8", newline="\n")
    return ziel


def ressourcen_bauen(w: Werkzeuge, version, code):
    print("4) Ressourcen (aapt2)")
    res_zip = BAU / "res.zip"
    lauf([w.aapt2, "compile", "--dir", str(HUELLE / "res"), "-o", str(res_zip)])
    base = BAU / "base.apk"
    if base.exists():
        base.unlink()
    lauf([w.aapt2, "link", "-o", str(base),
          "-I", str(w.android_jar),
          "--manifest", str(HUELLE / "AndroidManifest.xml"),
          "-A", str(BAU / "assets"),
          "--min-sdk-version", str(MIN_SDK),
          "--target-sdk-version", str(ZIEL_SDK),
          "--version-code", str(code),
          "--version-name", version,
          str(res_zip)])
    return base


def klassen_bauen(w: Werkzeuge, quelle):
    print("5) Java übersetzen (javac) + dexen (d8)")
    klassen = BAU / "klassen"
    if klassen.exists():
        shutil.rmtree(klassen)
    klassen.mkdir(parents=True)
    lauf([w.javac, "--release", "11", "-nowarn", "-classpath", str(w.android_jar),
          "-d", str(klassen), str(quelle)])

    dex = BAU / "dex"
    if dex.exists():
        shutil.rmtree(dex)
    dex.mkdir(parents=True)
    dateien = sorted(str(p) for p in klassen.rglob("*.class"))
    if not dateien:
        raise SystemExit("FEHLER: javac hat keine Klassendateien erzeugt.")
    # Achtung: d8 nimmt seit build-tools 35 KEIN Verzeichnis mehr als Eingabe,
    # sondern einzelne .class-Dateien (gemessen: „Unsupported source file type“).
    lauf([w.d8, "--lib", str(w.android_jar), "--min-api", str(MIN_SDK),
          "--output", str(dex)] + dateien)
    return dex / "classes.dex"


def dex_einbauen(base: Path, dex: Path, ziel: Path):
    """classes.dex in die APK legen, ohne die vorhandenen Einträge umzuschreiben."""
    with zipfile.ZipFile(base) as rein, zipfile.ZipFile(ziel, "w") as raus:
        for e in rein.infolist():
            neu = zipfile.ZipInfo(e.filename, date_time=e.date_time)
            neu.compress_type = e.compress_type
            neu.external_attr = e.external_attr
            neu.internal_attr = e.internal_attr
            neu.create_system = e.create_system
            raus.writestr(neu, rein.read(e.filename))
        raus.writestr("classes.dex", dex.read_bytes(), zipfile.ZIP_DEFLATED)


def schluessel(w: Werkzeuge):
    """Signaturschlüssel: einmal erzeugen, dann wiederverwenden (sonst keine Updates)."""
    SIGNATUR.mkdir(parents=True, exist_ok=True)
    ks = SIGNATUR / "netzwerk-labor.jks"
    zugang = SIGNATUR / "zugang.txt"
    if ks.is_file() and zugang.is_file():
        m = re.search(r"^Passwort:\s*(\S+)\s*$", zugang.read_text(encoding="utf-8"), re.M)
        if not m:
            raise SystemExit(f"FEHLER: in {zugang} steht kein Passwort.")
        return ks, m.group(1)
    if ks.is_file() and not zugang.is_file():
        raise SystemExit(
            f"FEHLER: {ks} ist da, aber {zugang} fehlt — das Passwort ist unbekannt.\n"
            "  Entweder die Zugangsdatei wiederherstellen oder den Schlüssel löschen\n"
            "  (dann ist die App mit neuer Signatur nicht mehr über eine alte Fassung\n"
            "  installierbar — vorher deinstallieren)."
        )
    pw = secrets.token_urlsafe(18)
    print("   Signaturschlüssel erzeugen (einmalig, liegt in android/signatur/, nicht im Git)")
    lauf([w.keytool, "-genkeypair", "-keystore", str(ks), "-storetype", "PKCS12",
          "-alias", "netzwerk-labor", "-keyalg", "RSA", "-keysize", "2048", "-validity", "10950",
          "-storepass", pw, "-keypass", pw,
          "-dname", "CN=Netzwerk-Labor, OU=Lernprojekt, O=Netzwerk-Labor, C=DE"], geheim=pw)
    zugang.write_text(
        "Signaturschlüssel der Android-Fassung des Netzwerk-Labors\n"
        "=======================================================\n"
        f"Datei:      {ks.name}\n"
        "Alias:      netzwerk-labor\n"
        f"Passwort:   {pw}\n\n"
        "Dieser Schlüssel ist nicht geheim im Sinne eines Ladens bei Google Play — er\n"
        "signiert nur diese Installation. Er darf aber nicht verloren gehen: mit einer\n"
        "neuen Signatur kann Android die App nicht mehr über eine alte Fassung legen\n"
        "(dann erst deinstallieren).\n"
        "Beide Dateien stehen in .gitignore und gehören nicht ins Repositorium.\n",
        encoding="utf-8", newline="\n")
    return ks, pw


def bauen(a):
    version, code = version_lesen()
    w = Werkzeuge(sdk_finden(a.sdk))
    BAU.mkdir(parents=True, exist_ok=True)
    print(f"Netzwerk-Labor für Android — Version {version} (versionCode {code})")
    w.beschreiben()

    if a.ohne_spiel and (BAU / "spiel.html").is_file():
        einzel = BAU / "spiel.html"
        print(f"1) Spiel übersprungen — vorhandene Einzeldatei: {einzel.stat().st_size:,} Bytes")
    else:
        einzel = spiel_bauen()

    assets = mobil_einbetten(einzel, BAU / "assets" / "index.html")
    ikonen()
    quelle_java = version_in_java(version)

    base = ressourcen_bauen(w, version, code)
    dex = klassen_bauen(w, quelle_java)

    print("6) Packen, ausrichten, signieren")
    mit_dex = BAU / "mit-dex.apk"
    dex_einbauen(base, dex, mit_dex)
    ausgerichtet = BAU / "ausgerichtet.apk"
    lauf([w.zipalign, "-f", "4", str(mit_dex), str(ausgerichtet)])

    ks, pw = schluessel(w)
    ziel = Path(a.ziel).expanduser().resolve() if a.ziel else \
        PROGRAMM / f"Netzwerk-Labor-{version}-Android.apk"
    ziel.parent.mkdir(parents=True, exist_ok=True)
    lauf([w.java, "-jar", str(w.apksigner), "sign",
          "--ks", str(ks), "--ks-key-alias", "netzwerk-labor",
          "--ks-pass", "pass:" + pw, "--key-pass", "pass:" + pw,
          "--v4-signing-enabled", "false",
          "--out", str(ziel), str(ausgerichtet)], geheim=pw)
    return ziel, version, code, w, assets


def dreh_laedt_nicht(w: Werkzeuge, ziel: Path) -> list:
    """Am Bytecode der APK belegen: Ein Dreh lädt die Seite nicht neu.

    `configChanges` im Manifest verhindert schon, dass ein Dreh die Activity neu
    erzeugt. Dieser Test belegt den zweiten Teil der Zusage: Selbst wenn
    onConfigurationChanged liefe, steht in ihr kein `loadUrl`. Gemessen wird an der
    classes.dex **in der APK** (nicht an der Java-Quelle) — so ist ausgeschlossen, dass
    zwischen Quelle und Auslieferung etwas anderes landet. Erwartet wird genau ein
    loadUrl in onCreate (Start) und höchstens eines im Fehler-Rückfall onReceivedError.

    Hintergrund: Am Gerät ist das nicht messbar, wenn kein Telefon und kein Emulator
    da ist (gemessen 06.10.2026: `adb devices` war leer). Im Bytecode ist es messbar.
    """
    if not w.dexdump.is_file():
        print("     dexdump fehlt — Bytecode-Prüfung übersprungen")
        return []
    probe = BAU / "dreh-pruefung.dex"
    with zipfile.ZipFile(ziel) as z:
        probe.write_bytes(z.read("classes.dex"))
    r = lauf([w.dexdump, "-d", str(probe)], still=True)
    text = (r.stdout or "") + (r.stderr or "")

    # Methodenköpfe einsammeln ("name          : 'xyz'"); dexdump bricht lange Zeilen
    # um, deshalb matcht \s+ auch den Umbruch zwischen ':' und dem Namen.
    koepfe = [(m.start(), m.group(1)) for m in re.finditer(r"name\s+:\s*'([^']+)'", text)]

    def methode_an(position: int) -> str:
        name = "?"
        for pos, kandidat in koepfe:
            if pos < position:
                name = kandidat
            else:
                break
        return name

    aufrufe = {}
    for m in re.finditer(r"Landroid/webkit/WebView;\.loadUrl:", text):
        name = methode_an(m.start())
        aufrufe[name] = aufrufe.get(name, 0) + 1

    rot = []
    if aufrufe.get("onConfigurationChanged"):
        rot.append(f"onConfigurationChanged ruft {aufrufe['onConfigurationChanged']}x loadUrl — "
                   "ein Dreh würde die Seite neu laden")
    else:
        print("     Bytecode: onConfigurationChanged ruft 0x loadUrl")
    if not koepfe:
        rot.append("aus der dex ließ sich keine Methode lesen — Bytecode-Prüfung wertlos")
    else:
        verteilung = ", ".join(f"{name} {zahl}x" for name, zahl in sorted(aufrufe.items())) or "keine"
        print(f"     Bytecode: loadUrl in der ganzen dex — {verteilung}")
    return rot


def pruefen(ziel, version, code, w: Werkzeuge, assets: Path):
    print("7) Prüfen")
    rot = []

    r = lauf([w.java, "-jar", str(w.apksigner), "verify", "--verbose", "--print-certs", str(ziel)], still=True)
    zeilen = (r.stdout or "") + (r.stderr or "")
    signiert = "Verifies" in zeilen
    if not signiert:
        rot.append("apksigner verify meldet keine gültige Signatur")
    print("   Signatur: " + ("gültig" if signiert else "FEHLER"))
    for anfang in ("Signer #1 certificate DN:", "Verified using v1 scheme",
                   "Verified using v2 scheme", "Verified using v3 scheme"):
        for zeile in zeilen.splitlines():
            if zeile.strip().startswith(anfang):
                print("     " + zeile.strip())
                break

    r = lauf([w.aapt2, "dump", "badging", str(ziel)], still=True)
    badging = r.stdout or ""
    for schluesselname in ("package:", "sdkVersion:", "targetSdkVersion:", "application-label:",
                           "launchable-activity:"):
        for zeile in badging.splitlines():
            if zeile.startswith(schluesselname):
                print("     " + zeile.strip())
                break
    if f"versionName='{version}'" not in badging:
        rot.append(f"versionName ist nicht {version}")
    if f"versionCode='{code}'" not in badging:
        rot.append(f"versionCode ist nicht {code}")
    if "uses-permission" in badging:
        rot.append("die App fordert Rechte an — erwartet: keine")
    else:
        print("     uses-permission: keine (die App darf nicht ins Netz)")

    # Drehung — am gepackten Manifest geprüft, nicht an der Quelle: nur so ist belegt,
    # was wirklich in der APK steht.
    #   * badging nennt ein implizites Merkmal „screen.landscape/portrait“, sobald eine
    #     Activity auf eine Ausrichtung festgelegt ist.
    #   * screenOrientation muss -1 sein (SCREEN_ORIENTATION_UNSPECIFIED) oder ganz
    #     fehlen. Achtung: 0 ist NICHT „frei“, sondern SCREEN_ORIENTATION_LANDSCAPE —
    #     die alte Fassung trug 6 (SCREEN_ORIENTATION_SENSOR_LANDSCAPE).
    #   * configChanges muss orientation+screenSize(+screenLayout+smallestScreenSize)
    #     enthalten, sonst erzeugt ein Dreh die Activity neu und die Seite lädt.
    if "android.hardware.screen.landscape" in badging or "android.hardware.screen.portrait" in badging:
        rot.append("die APK ist noch auf eine Ausrichtung festgelegt "
                   "(badging nennt android.hardware.screen.landscape/-portrait)")
    else:
        print("     Ausrichtung: keine Sperre (badging nennt kein screen.landscape/-portrait)")
    r = lauf([w.aapt2, "dump", "xmltree", "--file", "AndroidManifest.xml", str(ziel)], still=True)
    baum = r.stdout or ""
    m = re.search(r"screenOrientation\(0x[0-9a-f]+\)=(-?\d+)", baum)
    if m and int(m.group(1)) != -1:
        rot.append(f"screenOrientation ist gesetzt (Wert {m.group(1)}) — erwartet: -1 = unspecified")
    else:
        print("     screenOrientation: -1 (unspecified) — die App dreht frei")
    m = re.search(r"configChanges\(0x[0-9a-f]+\)=0x([0-9a-fA-F]+)", baum)
    if not m:
        rot.append("configChanges steht nicht im gepackten Manifest — ein Dreh würde neu erzeugen")
    else:
        wert = int(m.group(1), 16)
        fehlt = [name for name, bit in (("orientation", 0x0080), ("screenSize", 0x0400),
                                        ("screenLayout", 0x0100), ("smallestScreenSize", 0x0800))
                 if not wert & bit]
        if fehlt:
            rot.append("configChanges fehlen: " + ", ".join(fehlt)
                       + " — ein Dreh würde die Activity neu erzeugen")
        else:
            print(f"     configChanges 0x{wert:08x}: orientation|screenSize|screenLayout|"
                  "smallestScreenSize gesetzt — ein Dreh erzeugt nichts neu")
    rot.extend(dreh_laedt_nicht(w, ziel))

    with zipfile.ZipFile(ziel) as z:
        namen = z.namelist()
        for pflicht in ("AndroidManifest.xml", "resources.arsc", "classes.dex", "assets/index.html"):
            if pflicht not in namen:
                rot.append(f"in der APK fehlt: {pflicht}")
        # aapt2 hängt an Ressourcenordner die Fassung an (res/mipmap-xxxhdpi-v4/…).
        # Deshalb wird auf das Muster geprüft, nicht auf den genauen Pfad.
        for muster, name in ((r"^res/mipmap-[a-z0-9-]+/ic_launcher\.png$", "Start-Symbol"),
                             (r"^res/mipmap-anydpi-v26/ic_launcher\.xml$", "adaptives Symbol")):
            if not any(re.match(muster, n) for n in namen):
                rot.append(f"in der APK fehlt: {name} ({muster})")
        drin = z.read("assets/index.html")
    if drin != assets.read_bytes():
        rot.append("assets/index.html weicht von der gebauten Seite ab")
    else:
        print(f"     assets/index.html  {len(drin):,} Bytes, byte-gleich zum Bau")

    groesse = ziel.stat().st_size
    print(f"\n   APK    {ziel}")
    print(f"   Größe  {groesse:,} Bytes ({groesse/1024/1024:.2f} MB)")
    print(f"   SHA256 {hashlib.sha256(ziel.read_bytes()).hexdigest()}")
    if rot:
        print("\n   ROT:")
        for x in rot:
            print("     - " + x)
        return 1
    print("   GRUEN: Signatur gültig, Kennwerte stimmen, keine Rechte, Assets vollständig.")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Netzwerk-Labor als Android-App bauen")
    ap.add_argument("--sdk", help="Pfad zum Android-SDK")
    ap.add_argument("--ziel", help="Zieldatei der APK (Standard: Programm/…)")
    ap.add_argument("--ohne-spiel", action="store_true",
                    help="web/index.html nicht neu bauen (nimmt bau/spiel.html)")
    ap.add_argument("--nur-pruefen", action="store_true", help="nur eine vorhandene APK prüfen")
    a = ap.parse_args()

    if a.nur_pruefen:
        version, code = version_lesen()
        w = Werkzeuge(sdk_finden(a.sdk))
        ziel = Path(a.ziel).expanduser().resolve() if a.ziel else \
            PROGRAMM / f"Netzwerk-Labor-{version}-Android.apk"
        return pruefen(ziel, version, code, w, BAU / "assets" / "index.html")

    ziel, version, code, w, assets = bauen(a)
    return pruefen(ziel, version, code, w, assets)


if __name__ == "__main__":
    sys.exit(main())
