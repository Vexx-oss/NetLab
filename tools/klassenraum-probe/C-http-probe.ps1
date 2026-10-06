# Probe für den Klassenraum-Live-Server (Stufe C2 des Auftrags KLASSENRAUM.md).
#
# Startet die gebaute .exe, bedient sie mit ECHTEN HTTP-Aufrufen (curl.exe und Invoke-WebRequest)
# und weist nach, dass der Server sich selbst beendet und den Port danach freigibt.
#
# Aufruf (die Ausführungsrichtlinie dieser Umgebung blockt Skriptdateien, deshalb so):
#   powershell.exe -ExecutionPolicy Bypass -File tools\klassenraum-probe\C-http-probe.ps1
#
# Der Server wird mit --ende-nach gestartet und beendet sich SELBST. Es wird kein fremder und
# kein eigener Prozess zwangsweise beendet (AGENTS.md Regel 1) - der PID-Hinweis steht am Ende
# nur für den Notfall da.
#
# Geschrieben für Windows PowerShell 5.1 (kein -SkipHttpErrorCheck, kein Start-ThreadJob):
# Statuscodes kommen von curl.exe, die Nebenläufigkeit aus curl --parallel, und
# Invoke-WebRequest braucht -UseBasicParsing (sonst parst die IE-Engine und wirft bei JSON).

[CmdletBinding()]
param(
    [string]$Exe,
    [int]$Port = 47119,
    [string]$Nachweis,
    [string]$Protokoll,
    [int]$Lebensdauer = 16
)

$ErrorActionPreference = "Stop"
$Hier = Split-Path -Parent $MyInvocation.MyCommand.Path
$Projekt = (Resolve-Path (Join-Path $Hier "..\..")).Path
if (-not $Exe) { $Exe = Join-Path $Projekt "tools\klassenraum\target\release\klassenraum.exe" }
if (-not $Nachweis) { $Nachweis = Join-Path $Projekt "Nachweise\Klassenraum\C-http.json" }
if (-not $Protokoll) { $Protokoll = Join-Path $Projekt "Nachweise\Klassenraum\C-http.txt" }
if (-not (Test-Path $Exe)) { throw "Nicht gefunden: $Exe (erst 'cargo build --release' in tools/klassenraum)" }
if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) { throw "curl.exe nicht gefunden" }

$Arbeit = Join-Path ([System.IO.Path]::GetTempPath()) ("klassenraum-probe-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force -Path $Arbeit | Out-Null
$stdout = Join-Path $Arbeit "server-out.txt"
$stderr = Join-Path $Arbeit "server-err.txt"
$ablage = Join-Path $Arbeit "ergebnisse.json"
$basis = "http://127.0.0.1:$Port"
$Nr = 0

# UTF-8 OHNE BOM und mit LF schreiben: Set-Content -Encoding utf8 setzt in PS 5.1 ein BOM, und
# ein BOM im Rumpf einer POST-Anfrage ist eine unnötige Fehlerquelle.
function Schreibe($pfad, $text) {
    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($pfad, ($text -replace "`r`n", "`n"), $enc)
}

# Kleine JSON-Bausteine (Ersatz für ConvertTo-Json, siehe unten).
function J($s) {
    if ($null -eq $s) { return "null" }
    $t = [string]$s
    $t = $t.Replace('\', '\\').Replace('"', '\"').Replace("`r", '\r').Replace("`n", '\n').Replace("`t", '\t')
    return '"' + $t + '"'
}
function JB($b) { if ($b) { "true" } else { "false" } }
function JZ($n) { return [string]([int64]$n) }
function JHashtable($h) {
    if ($null -eq $h -or $h.Count -eq 0) { return "{}" }
    $p = @()
    foreach ($k in $h.Keys) { $p += (J $k) + ":" + (J $h[$k]) }
    return "{" + ($p -join ",") + "}"
}

$script:Zeilen = New-Object System.Collections.ArrayList
$script:Fehler = $false
$script:ProtokollPfad = $Protokoll

function Sag($text, $farbe = "Gray") {
    Write-Host $text -ForegroundColor $farbe
    $null = $script:Zeilen.Add($text)
    # Sofort auch auf die Platte: Haengt der Lauf spaeter, zeigt das Protokoll den letzten Schritt.
    if ($script:ProtokollPfad) {
        try { [System.IO.File]::AppendAllText($script:ProtokollPfad, $text + "`n", (New-Object System.Text.UTF8Encoding($false))) } catch { }
    }
}

$Messungen = New-Object System.Collections.ArrayList

function Messung($name, $methode, $weg, $status, $erwartet, $koepfe, $rumpf, $befehl) {
    $ok = ("$status" -eq "$erwartet")
    $null = $Messungen.Add([pscustomobject]@{
        name = $name; methode = $methode; weg = $weg; befehl = $befehl
        status = "$status"; erwartet = "$erwartet"; ok = $ok
        koepfe = $koepfe; antwort = $rumpf
    })
    $marke = if ($ok) { "" } else { "  << FEHLER" }
    Sag ("  {0,-38} {1,-7} {2,-24} -> {3,-4} (erwartet {4}){5}" -f $name, $methode, $weg, $status, $erwartet, $marke) $(if ($ok) { "Green" } else { "Red" })
}

# Ein Aufruf mit curl.exe: Statuscode und Kopfzeilen landen in Dateien, der Rumpf wird zurueckgegeben.
function Rufen($name, $methode, $weg, $erwartet, $curlZusatz = @(), $zeigeKoepfe = @()) {
    $script:Nr++
    $kopfDatei = Join-Path $Arbeit ("kopf-{0:d2}.txt" -f $script:Nr)
    $rumpfDatei = Join-Path $Arbeit ("rumpf-{0:d2}.txt" -f $script:Nr)
    $argumente = @("-s", "-o", $rumpfDatei, "-D", $kopfDatei, "-w", "%{http_code}", "--max-time", "5",
                   "-X", $methode, "$basis$weg") + $curlZusatz
    $code = & curl.exe @argumente
    $rumpf = if (Test-Path $rumpfDatei) { (Get-Content $rumpfDatei -Raw) } else { "" }
    $koepfe = @{}
    if (Test-Path $kopfDatei) {
        foreach ($z in (Get-Content $kopfDatei)) {
            $t = $z -split ":", 2
            if ($t.Count -eq 2) { $koepfe[$t[0].Trim().ToLower()] = $t[1].Trim() }
        }
    }
    $auswahl = @{}
    foreach ($k in $zeigeKoepfe) { $auswahl[$k] = $koepfe[$k.ToLower()] }
    Messung $name $methode $weg $code $erwartet $auswahl $rumpf "curl.exe"
    return [pscustomobject]@{ code = [int]$code; rumpf = $rumpf; koepfe = $koepfe }
}

$p = $null
try {
    Sag "Klassenraum-Live-Server - Probe (Stufe C2)" "Cyan"
    Sag ("  Exe     {0}" -f $Exe)
    Sag ("  Zeit    {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))
    Sag ("  Groesse {0} Bytes  SHA256 {1}" -f (Get-Item $Exe).Length, (Get-FileHash $Exe -Algorithm SHA256).Hash)
    Sag ""
    Sag "1) Server starten (beendet sich nach $Lebensdauer s selbst)" "Cyan"
    $p = Start-Process -FilePath $Exe -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr `
        -ArgumentList @("--port", "$Port", "--bind", "127.0.0.1", "--sitzung", "NL-4F7K", "--ablage", $ablage, "--ende-nach", "$Lebensdauer")
    Sag ("   PID {0} auf {1}" -f $p.Id, $basis)

    $uhr = [Diagnostics.Stopwatch]::StartNew()
    $bereit = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Milliseconds 100
        $c = & curl.exe -s -o NUL -w "%{http_code}" --max-time 2 "$basis/liste?sitzung=NL-4F7K"
        if ("$c" -eq "200") { $bereit = $true; break }
    }
    if (-not $bereit) { throw "Server antwortet nicht auf $basis" }
    Sag ("   bereit nach {0:N1} s" -f $uhr.Elapsed.TotalSeconds) "Green"
    Sag ""

    Sag "2) Echte HTTP-Aufrufe (curl.exe)" "Cyan"
    $datei1 = Join-Path $Arbeit "ergebnis1.json"
    Schreibe $datei1 '{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214,"code":"E-4F7K-P3-3-214-7Q"}'

    $null = Rufen "Ergebnis abgeben (neu)" "POST" "/ergebnis" 201 @("-H", "Content-Type: application/json", "--data-binary", "@$datei1")
    $r2 = Rufen "Ergebnisse abholen" "GET" "/liste?sitzung=NL-4F7K" 200 @() @("content-type", "cache-control", "connection")
    $null = Rufen "derselbe Code nochmal (idempotent)" "POST" "/ergebnis" 200 @("-H", "Content-Type: application/json", "--data-binary", "@$datei1")

    $r4 = Rufen "Preflight aus file:// (Origin null)" "OPTIONS" "/ergebnis" 204 @(
        "-H", "Origin: null", "-H", "Access-Control-Request-Method: POST",
        "-H", "Access-Control-Request-Headers: content-type",
        "-H", "Access-Control-Request-Private-Network: true") @(
        "access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers", "access-control-allow-private-network")

    $null = Rufen "Liste aus der Tauri-Fassung" "GET" "/liste?sitzung=NL-4F7K" 200 @("-H", "Origin: http://tauri.localhost") @("access-control-allow-origin")

    $dateiName = Join-Path $Arbeit "klarname.json"
    Schreibe $dateiName '{"sitzung":"NL-4F7K","platz":"Anna Müller","sterne":3,"dauerS":214,"code":"E-2"}'
    $null = Rufen "Klarname als Platz wird abgelehnt" "POST" "/ergebnis" 400 @("-H", "Content-Type: application/json", "--data-binary", "@$dateiName")

    $dateiFeld = Join-Path $Arbeit "fremdfeld.json"
    Schreibe $dateiFeld '{"sitzung":"NL-4F7K","platz":"P4","sterne":3,"dauerS":10,"code":"E-3","name":"Anna"}'
    $null = Rufen "fremdes Feld wird abgelehnt" "POST" "/ergebnis" 400 @("-H", "Content-Type: application/json", "--data-binary", "@$dateiFeld")

    $dateiSitzung = Join-Path $Arbeit "fremdesitzung.json"
    Schreibe $dateiSitzung '{"sitzung":"NL-XXXX","platz":"P4","sterne":3,"dauerS":10,"code":"E-4"}'
    $null = Rufen "fremde Sitzung wird abgelehnt" "POST" "/ergebnis" 409 @("-H", "Content-Type: application/json", "--data-binary", "@$dateiSitzung")

    $null = Rufen "falscher Content-Type" "POST" "/ergebnis" 415 @("-H", "Content-Type: text/plain", "--data", '{"a":1}')

    $gross = Join-Path $Arbeit "gross.json"
    Schreibe $gross ('{"sitzung":"NL-4F7K","platz":"P5","sterne":1,"dauerS":5,"code":"' + ("X" * 5000) + '"}')
    $null = Rufen "Rumpf ueber 4096 Bytes" "POST" "/ergebnis" 413 @("-H", "Content-Type: application/json", "--data-binary", "@$gross")

    $null = Rufen "unbekannter Pfad" "GET" "/unbekannt" 404
    $null = Rufen "falsche Methode" "DELETE" "/liste" 405 @() @("allow")
    $rListe = Rufen "Liste ohne Parameter (Startsitzung gilt)" "GET" "/liste" 200
    $anzahl = ($rListe.rumpf | ConvertFrom-Json).anzahl
    Sag ("   anzahl in der Liste: {0}" -f $anzahl) "DarkGray"

    Sag ""
    Sag "4b) Zweiter Server OHNE Startsitzung: Liste ohne Parameter muss 400 sein" "Cyan"
    $stdout2 = Join-Path $Arbeit "server2-out.txt"
    $stderr2 = Join-Path $Arbeit "server2-err.txt"
    $p2 = Start-Process -FilePath $Exe -PassThru -RedirectStandardOutput $stdout2 -RedirectStandardError $stderr2 `
        -ArgumentList @("--port", "$($Port + 1)", "--bind", "127.0.0.1", "--still", "--ende-nach", "8")
    $basis2 = "http://127.0.0.1:$($Port + 1)"
    $bereit2 = $false
    for ($i = 0; $i -lt 80; $i++) {
        Start-Sleep -Milliseconds 100
        $c = & curl.exe -s -o NUL -w "%{http_code}" --max-time 2 "$basis2/liste?sitzung=NL-4F7K"
        if ("$c" -eq "200") { $bereit2 = $true; break }
    }
    if ($bereit2) {
        Messung "ohne Startsitzung: Liste ohne Parameter" "GET" "/liste" (& curl.exe -s -o NUL -w "%{http_code}" --max-time 5 "$basis2/liste") 400 @{} "" "curl.exe"
        Messung "ohne Startsitzung: Liste mit Sitzung" "GET" "/liste?sitzung=NL-4F7K" (& curl.exe -s -o NUL -w "%{http_code}" --max-time 5 "$basis2/liste?sitzung=NL-4F7K") 200 @{} "" "curl.exe"
    } else {
        Sag "   zweiter Server antwortet nicht auf $basis2" "Red"
        $script:Fehler = $true
    }
    $p2.WaitForExit(25000) | Out-Null

    Sag ""
    Sag "3) Zweiter Client: Invoke-WebRequest (Windows PowerShell 5.1)" "Cyan"
    # -UseBasicParsing: sonst parst PS 5.1 mit der IE-Engine und wirft bei JSON-Antworten
    # "Der Objektverweis wurde nicht auf eine Objektinstanz festgelegt" (gemessen 06.10.2026).
    $iwrPost = Invoke-WebRequest -Uri "$basis/ergebnis" -Method POST -ContentType "application/json" `
        -Body '{"sitzung":"NL-4F7K","platz":"P7","sterne":2,"dauerS":99,"code":"E-4F7K-P7-2-99-11"}' -TimeoutSec 5 -UseBasicParsing
    Messung "Invoke-WebRequest POST" "POST" "/ergebnis" $iwrPost.StatusCode 201 @{} $iwrPost.Content "Invoke-WebRequest"
    $iwrGet = Invoke-WebRequest -Uri "$basis/liste?sitzung=NL-4F7K" -TimeoutSec 5 -UseBasicParsing
    Messung "Invoke-WebRequest GET" "GET" "/liste" $iwrGet.StatusCode 200 @{} $iwrGet.Content "Invoke-WebRequest"
    $rumpfListe = $iwrGet.Content

    Sag ""
    Sag "4) Nebenlaeufigkeit: 24 gleichzeitige Anfragen (curl --parallel)" "Cyan"
    # Je URL ein eigenes -o NUL, sonst schreibt curl alle Rumpfe auf die Ausgabe.
    $argumente24 = @("-s", "--parallel", "--parallel-max", "24", "-w", "%{http_code}`n")
    foreach ($i in 1..24) { $argumente24 += @("-o", "NUL", "$basis/liste?sitzung=NL-4F7K") }
    $codes24 = & curl.exe @argumente24
    $z503 = ($codes24 | Where-Object { "$_" -eq "503" }).Count
    $z200 = ($codes24 | Where-Object { "$_" -eq "200" }).Count
    $antworten = $codes24.Count
    Sag ("   beantwortet: {0}/24   200: {1}   503: {2}   (Obergrenze {3} gleichzeitig; 503 ist die ehrliche Abweisung)" -f $antworten, $z200, $z503, 16) "Green"
    $null = $Messungen.Add([pscustomobject]@{ name = "24 gleichzeitige Anfragen"; methode = "GET"; weg = "/liste"; befehl = "curl --parallel";
        status = "beantwortet:$antworten 200:$z200 503:$z503"; erwartet = "beantwortet=24, nur 200 oder 503";
        ok = (($antworten -eq 24) -and (($z200 + $z503) -eq 24)); koepfe = @{}; antwort = "" })

    Sag ""
    Sag "5) Selbst beenden und Port freigeben" "Cyan"
    $beendet = $p.WaitForExit(($Lebensdauer + 15) * 1000)
    Start-Sleep -Milliseconds 400
    Sag ("   von selbst beendet: {0} (Exitcode {1})" -f $beendet, $(if ($beendet) { $p.ExitCode } else { "laeuft noch" })) $(if ($beendet) { "Green" } else { "Red" })
    $null = $Messungen.Add([pscustomobject]@{ name = "Server beendet sich selbst"; methode = "Lebensdauer"; weg = "--ende-nach $Lebensdauer"; befehl = "WaitForExit";
        status = "$beendet"; erwartet = "True"; ok = $beendet; koepfe = @{}; antwort = "" })

    $frei = $false
    try {
        $probe = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
        $probe.Start(); $probe.Stop(); $frei = $true
    } catch { $frei = $false }
    Sag ("   Port {0} nach dem Beenden frei: {1}" -f $Port, $frei) $(if ($frei) { "Green" } else { "Red" })
    $null = $Messungen.Add([pscustomobject]@{ name = "Port nach Beenden frei"; methode = "bind"; weg = "127.0.0.1:$Port"; befehl = "TcpListener";
        status = "$frei"; erwartet = "True"; ok = $frei; koepfe = @{}; antwort = "" })

    $fehlerzahl = 0
    foreach ($m in $Messungen) { if (-not $m.ok) { $fehlerzahl++ } }
    $gut = ($fehlerzahl -eq 0)
    Sag ("   Messungen: {0}, davon nicht bestanden: {1}" -f $Messungen.Count, $fehlerzahl) $(if ($gut) { "Green" } else { "Red" })
    Sag "   [a] Kennzahlen eingesammelt"
    $startausgabe = if (Test-Path $stdout) { (Get-Content $stdout -Raw) } else { "" }
    $fehlerausgabe = if (Test-Path $stderr) { (Get-Content $stderr -Raw) } else { "" }
    $sha = (Get-FileHash $Exe -Algorithm SHA256).Hash
    $bytes = (Get-Item $Exe).Length
    Sag "   [b] Ergebnisfeld gebaut"
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Nachweis) | Out-Null
    # JSON von Hand: ConvertTo-Json dreht in Windows PowerShell 5.1 bei diesem Objekt durch
    # (gemessen 06.10.2026: der Prozess lief mit 100 % CPU weiter, ohne fertig zu werden).
    # ACHTUNG: In PowerShell bindet das Komma STAERKER als '+'. Ohne die Klammern um jedes
    # Element verschwinden die Trennkommas stillschweigend ("{a:1 b:2}" statt "{a:1,b:2}") -
    # gemessen am 06.10.2026, das Nachweis-JSON war dadurch unlesbar.
    $mliste = @()
    foreach ($m in $Messungen) {
        $mliste += "{" + (@(
            ((J "name") + ":" + (J $m.name)),
            ((J "methode") + ":" + (J $m.methode)),
            ((J "weg") + ":" + (J $m.weg)),
            ((J "befehl") + ":" + (J $m.befehl)),
            ((J "status") + ":" + (J $m.status)),
            ((J "erwartet") + ":" + (J $m.erwartet)),
            ((J "ok") + ":" + (JB $m.ok)),
            ((J "koepfe") + ":" + (JHashtable $m.koepfe)),
            ((J "antwort") + ":" + (J $m.antwort))
        ) -join ",") + "}"
    }
    $json = "{" + (@(
        ((J "zeit") + ":" + (J (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))),
        ((J "server") + ":" + (J $Exe)),
        ((J "serverSha256") + ":" + (J $sha)),
        ((J "serverBytes") + ":" + (JZ $bytes)),
        ((J "bind") + ":" + (J "127.0.0.1:$Port")),
        ((J "sitzung") + ":" + (J "NL-4F7K")),
        ((J "lebensdauerS") + ":" + (JZ $Lebensdauer)),
        ((J "anzahlMessungen") + ":" + (JZ $Messungen.Count)),
        ((J "alleOk") + ":" + (JB $gut)),
        ((J "nebenlaeufigkeit") + ":{" + (@(
            ((J "angefragt") + ":" + (JZ 24)),
            ((J "beantwortet") + ":" + (JZ $antworten)),
            ((J "antwort200") + ":" + (JZ $z200)),
            ((J "antwort503") + ":" + (JZ $z503))
        ) -join ",") + "}"),
        ((J "rumpfListeBeispiel") + ":" + (J $rumpfListe)),
        ((J "corsPreflight") + ":" + (JHashtable $r4.koepfe)),
        ((J "messungen") + ":[" + ($mliste -join ",") + "]"),
        ((J "startausgabe") + ":" + (J $startausgabe)),
        ((J "fehlerausgabe") + ":" + (J $fehlerausgabe))
    ) -join ",") + "}"
    Schreibe $Nachweis $json
    Sag ("   [c] JSON geschrieben ({0} Zeichen)" -f $json.Length)
    # Selbstprüfung: Das von Hand gebaute JSON muss sich wieder einlesen lassen.
    try {
        $pruef = $json | ConvertFrom-Json
        if ($pruef.anzahlMessungen -ne $Messungen.Count) { throw "anzahlMessungen stimmt nicht" }
        Sag ("   [d] JSON wieder eingelesen, {0} Messungen" -f $pruef.anzahlMessungen) "Green"
    } catch {
        Sag ("   [d] JSON NICHT wieder einlesbar: " + $_.Exception.Message) "Red"
        $script:Fehler = $true
    }
    Sag ""
    Sag ("Nachweis: {0}  ({1} Messungen, alle bestanden: {2})" -f $Nachweis, $Messungen.Count, $gut) $(if ($gut) { "Green" } else { "Red" })
    if (-not $gut) { $script:Fehler = $true }
}
catch {
    Sag ("ABBRUCH: {0}" -f $_.Exception.Message) "Red"
    if ($p -and -not $p.HasExited) { Sag ("Server laeuft noch als PID {0} - nur diese PID beenden." -f $p.Id) "Yellow" }
    $script:Fehler = $true
}
if ($p -and -not $p.HasExited) {
    Sag ("Hinweis: Server laeuft noch als PID {0} - nur diese PID beenden." -f $p.Id) "Yellow"
}
Sag ("Arbeitsordner: {0}" -f $Arbeit) "DarkGray"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Protokoll) | Out-Null
Schreibe $Protokoll (($script:Zeilen -join "`n") + "`n")
Write-Host ("Protokoll: {0}" -f $Protokoll) -ForegroundColor DarkGray
if ($script:Fehler) { exit 1 }
