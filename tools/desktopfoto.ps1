# Bildschirmfoto des ganzen Desktops (oder eines Ausschnitts) – zeigt die Leiste so, wie der Nutzer sie sieht.
#   powershell -ExecutionPolicy Bypass -File tools\desktopfoto.ps1 -Datei bild.png [-X 0 -Y 0 -B 0 -H 0]
param([string]$Datei = "desktop.png", [int]$X = 0, [int]$Y = 0, [int]$B = 0, [int]$H = 0)
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class DpiNl { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }'
[DpiNl]::SetProcessDPIAware() | Out-Null
$schirm = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
if ($B -le 0) { $B = $schirm.Width; $H = $schirm.Height }
$bild = New-Object System.Drawing.Bitmap $B, $H
$g = [System.Drawing.Graphics]::FromImage($bild)
$g.CopyFromScreen($X, $Y, 0, 0, $bild.Size)
$bild.Save($Datei, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bild.Dispose()
Write-Output $Datei
