# Leerlauf messen (Konzept § 9.7 Regel 4/5): CPU und Arbeitsspeicher des Netzwerk-Labors inkl. aller WebView2-Kindprozesse.
#   powershell -ExecutionPolicy Bypass -File tools\messen.ps1 [-Sekunden 60]
# Gibt eine Zeile JSON aus: Prozesse, CPU-% (über alle Kerne gemittelt), Arbeitsspeicher (Working Set, privat).
param([int]$Sekunden = 60)
$haupt = Get-CimInstance Win32_Process -Filter "Name = 'Netzwerk-Labor.exe'" | Select-Object -First 1
if (-not $haupt) { Write-Output '{"fehler":"Netzwerk-Labor.exe läuft nicht"}'; exit 1 }
function Nachkommen($id) {
  $kinder = Get-CimInstance Win32_Process -Filter "ParentProcessId = $id"
  foreach ($k in $kinder) { $k; Nachkommen $k.ProcessId }
}
$alle = @($haupt) + @(Nachkommen $haupt.ProcessId)
$ids = $alle | ForEach-Object { $_.ProcessId }
$vorher = @{}; foreach ($p in Get-Process -Id $ids -ErrorAction SilentlyContinue) { $vorher[$p.Id] = $p.TotalProcessorTime.TotalMilliseconds }
Start-Sleep -Seconds $Sekunden
$cpuMs = 0; $ws = 0; $privat = 0
foreach ($p in Get-Process -Id $ids -ErrorAction SilentlyContinue) {
  if ($vorher.ContainsKey($p.Id)) { $cpuMs += $p.TotalProcessorTime.TotalMilliseconds - $vorher[$p.Id] }
  $ws += $p.WorkingSet64; $privat += $p.PrivateMemorySize64
}
$kerne = [Environment]::ProcessorCount
$cpu = [math]::Round(100 * $cpuMs / ($Sekunden * 1000 * $kerne), 3)
[pscustomobject]@{prozesse = $ids.Count; sekunden = $Sekunden; cpuProzent = $cpu; cpuProzentEinKern = [math]::Round(100 * $cpuMs / ($Sekunden * 1000), 2);
  arbeitsspeicherMB = [math]::Round($ws / 1MB, 1); privatMB = [math]::Round($privat / 1MB, 1)} | ConvertTo-Json -Compress
