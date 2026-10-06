# Entwicklungsrunde: den PC-Bau in Sekunden statt Minuten sehen.
#
# Warum es dieses Skript gibt (gemessen von „build-engineer“ am 06.10.2026, Bericht
# Nachweise/experten/build-messung.md):
#   * `cargo tauri build` (Release) braucht 241,3 s, mit dem üblichen `cargo build --release`
#     davor 661,2 s — und bei JEDER App-Änderung allein 104,3–176,0 s Neu-Link.
#   * Dasselbe im Debug-Profil: 4,42 s je Iteration (gemessen: Release 175,97 s gegen
#     Debug 4,42 s).
# Die Auslieferung bleibt unverändert Release (`cargo tauri build`) — dieses Skript ist
# NUR für die Entwicklungsrunde gedacht. Es baut dieselbe Hülle, ohne Bündel (kein
# Installer, kein MSI), und startet sie auf Wunsch gleich.
#
# Reihenfolge ist wichtig: `python bauen.py` erzeugt web/ (die Hülle lädt web/). Ohne das
# zeigt das Fenster den alten Stand. Dieselbe Regel steht in docs/Bauen.md.
#
# Aufruf:
#   pwsh -File shell/entwickeln.ps1              # bauen (Debug) und starten
#   pwsh -File shell/entwickeln.ps1 -NurBauen    # nur bauen
[CmdletBinding()]
param(
    [switch]$NurBauen
)

$ErrorActionPreference = "Stop"
$Projekt = Split-Path -Parent $PSScriptRoot
$Huelle = Join-Path $PSScriptRoot "src-tauri"

Write-Host "1) Web-Fassung bauen (python bauen.py)" -ForegroundColor Cyan
Push-Location $Projekt
try {
    python bauen.py
    if ($LASTEXITCODE -ne 0) { throw "bauen.py ist mit $LASTEXITCODE abgebrochen." }
}
finally { Pop-Location }

Write-Host "2) Hülle im Debug-Profil bauen (cargo build)" -ForegroundColor Cyan
Push-Location $Huelle
$uhr = [Diagnostics.Stopwatch]::StartNew()
try {
    cargo build
    if ($LASTEXITCODE -ne 0) { throw "cargo build ist mit $LASTEXITCODE abgebrochen." }
}
finally { Pop-Location }
$uhr.Stop()
Write-Host ("   Dauer: {0:N1} s" -f $uhr.Elapsed.TotalSeconds) -ForegroundColor Green

$exe = Join-Path $Huelle "target\debug\netzwerk-labor.exe"
if (-not (Test-Path $exe)) { throw "Nicht gefunden: $exe" }

if ($NurBauen) {
    Write-Host "Fertig. Ausführbar: $exe" -ForegroundColor Green
    exit 0
}

# Starten. Es wird NUR diese eine, selbst gestartete Instanz wieder beendet — nie ein
# Prozess nach Namen (AGENTS.md, Regel 1). Die Einzelinstanz-Sperre der Hülle verhindert
# einen zweiten Start, solange eine andere Fassung läuft; dann bricht der Start mit
# Exitcode 0 ab und das ist kein Fehler dieses Skripts.
Write-Host "3) Starten (nur diese PID wird am Ende beendet)" -ForegroundColor Cyan
$p = Start-Process -FilePath $exe -PassThru
Write-Host "   PID $($p.Id) — Fenster schließen beendet die Runde."
$p.WaitForExit()
Write-Host "   Beendet mit Exitcode $($p.ExitCode)." -ForegroundColor Green
