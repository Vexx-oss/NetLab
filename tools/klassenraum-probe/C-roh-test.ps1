# Rohdiagnose 3: genau die Anfrage schicken, die Invoke-WebRequest schickt - mit blankem Socket.
# So sieht man, was der Server wirklich antwortet.
$port = 47131
$exe = "C:\Users\Student\Documents\Joshua\10-Projekte\Lernprojekte\Netzwerk-Labor\tools\klassenraum\target\release\klassenraum.exe"
$o = Join-Path $env:TEMP "roh3-out.txt"; $e = Join-Path $env:TEMP "roh3-err.txt"
$p = Start-Process -FilePath $exe -PassThru -RedirectStandardOutput $o -RedirectStandardError $e `
    -ArgumentList @("--port", "$port", "--bind", "127.0.0.1", "--sitzung", "NL-4F7K", "--ende-nach", "15")
Start-Sleep -Milliseconds 900

$rumpf = '{"sitzung":"NL-4F7K","platz":"P7","sterne":2,"dauerS":99,"code":"E-4F7K-P7-2-99-11"}'
$rb = [System.Text.Encoding]::ASCII.GetBytes($rumpf)
$kopf = "POST /ergebnis HTTP/1.1`r`n" +
        "User-Agent: Mozilla/5.0 (Windows NT; Windows NT 10.0; de-DE) WindowsPowerShell/5.1.26100.9444`r`n" +
        "Content-Type: application/json`r`n" +
        "Host: 127.0.0.1:$port`r`n" +
        "Content-Length: $($rb.Length)`r`n" +
        "Expect: 100-continue`r`n" +
        "Connection: Keep-Alive`r`n`r`n"
$kb = [System.Text.Encoding]::ASCII.GetBytes($kopf)

$c = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $port)
$c.NoDelay = $true
$s = $c.GetStream()
$s.ReadTimeout = 6000
$s.Write($kb, 0, $kb.Length); $s.Flush()
Write-Host "Kopf gesendet, warte auf Zwischenantwort ..." -ForegroundColor Cyan
$buf = New-Object byte[] 8192
$n = $s.Read($buf, 0, $buf.Length)
Write-Host ("ZURUECK ({0} Bytes): {1}" -f $n, ([System.Text.Encoding]::ASCII.GetString($buf, 0, $n) -replace "`r`n", " | "))
if ($n -gt 0 -and [System.Text.Encoding]::ASCII.GetString($buf, 0, $n) -match "100 Continue") {
    $s.Write($rb, 0, $rb.Length); $s.Flush()
    Write-Host "Rumpf gesendet, warte auf Antwort ..." -ForegroundColor Cyan
    Start-Sleep -Milliseconds 200
    $n2 = $s.Read($buf, 0, $buf.Length)
    Write-Host ("ANTWORT ({0} Bytes):" -f $n2) -ForegroundColor Yellow
    Write-Host ([System.Text.Encoding]::UTF8.GetString($buf, 0, $n2))
}
$c.Close()
$p.WaitForExit(25000) | Out-Null
Write-Host "--- Serverstderr ---"; Get-Content $e -Raw
