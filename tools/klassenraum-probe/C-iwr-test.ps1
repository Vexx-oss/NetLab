# Kleiner Diagnoselauf: Warum scheitert Invoke-WebRequest (POST) an diesem Server?
# Verdacht: Windows PowerShell 5.1 schickt "Expect: 100-continue" und wartet auf die
# Zwischenantwort "HTTP/1.1 100 Continue", die der Server nicht sendet.
$exe = "C:\Users\Student\Documents\Joshua\10-Projekte\Lernprojekte\Netzwerk-Labor\tools\klassenraum\target\release\klassenraum.exe"
$port = 47126
$o = Join-Path $env:TEMP "iwrt-out.txt"; $e = Join-Path $env:TEMP "iwrt-err.txt"
$p = Start-Process -FilePath $exe -PassThru -RedirectStandardOutput $o -RedirectStandardError $e `
    -ArgumentList @("--port", "$port", "--bind", "127.0.0.1", "--sitzung", "NL-4F7K", "--ende-nach", "25")
Start-Sleep -Milliseconds 900
$basis = "http://127.0.0.1:$port"
$rumpf = '{"sitzung":"NL-4F7K","platz":"P7","sterne":2,"dauerS":99,"code":"E-4F7K-P7-2-99-11"}'

function Zeige($was, $block) {
    Write-Host "--- $was ---" -ForegroundColor Cyan
    try { & $block } catch {
        Write-Host "  Ausnahme: $($_.Exception.Message)" -ForegroundColor Yellow
        $r = $_.Exception.Response
        if ($r) {
            $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
            Write-Host ("  Status {0}, Rumpf: {1}" -f [int]$r.StatusCode, $sr.ReadToEnd())
        }
    }
}

Zeige "A) Invoke-WebRequest mit Standardeinstellung (Expect: 100-continue aktiv)" {
    $a = Invoke-WebRequest -Uri "$basis/ergebnis" -Method POST -ContentType "application/json" -Body $rumpf -TimeoutSec 8
    Write-Host ("  Status {0}: {1}" -f $a.StatusCode, $a.Content)
}

Zeige "B) Invoke-WebRequest ohne Expect: 100-continue" {
    [System.Net.ServicePointManager]::Expect100Continue = $false
    $b = Invoke-WebRequest -Uri "$basis/ergebnis" -Method POST -ContentType "application/json" -Body $rumpf -TimeoutSec 8
    Write-Host ("  Status {0}: {1}" -f $b.StatusCode, $b.Content)
}

Zeige "C) curl.exe ohne/mit Expect" {
    $c1 = & curl.exe -s -o NUL -w "%{http_code}" -X POST "$basis/ergebnis" -H "Content-Type: application/json" --data-binary "@$env:TEMP\iwrt-b.json"
    Write-Host "  curl ohne Expect: $c1"
    $c2 = & curl.exe -s -o NUL -w "%{http_code}" -X POST "$basis/ergebnis" -H "Content-Type: application/json" -H "Expect: 100-continue" --data-binary "@$env:TEMP\iwrt-b.json"
    Write-Host "  curl mit  Expect: $c2"
}

Set-Content -Path "$env:TEMP\iwrt-b.json" -Value $rumpf -Encoding ascii -NoNewline
$p.WaitForExit(40000) | Out-Null
