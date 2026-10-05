@echo off
rem ---------------------------------------------------------------------------
rem  Netzwerk-Labor: Integritaetslabel des Programmordners zuruecksetzen
rem
rem  Hintergrund (gemessen 05.10.2026, Nachweise\1.2-Start\BEFUND.md):
rem  Die Werkzeug-Sandbox kann den Vault auf das Integritaetslabel "Niedrig"
rem  setzen. Dann laeuft auch Netzwerk-Labor.exe als Low-Prozess, darf
rem  %%LOCALAPPDATA%% nicht beschreiben und die WebView2-Laufzeit stuerzt beim
rem  Anlegen ihres Profils ab ("failed to create webview", 0x800700AA).
rem
rem  Dieses Skript setzt das Label fuer diesen Ordner (und alles darin) auf
rem  "Mittel" zurueck. Es braucht keine Administratorrechte.
rem ---------------------------------------------------------------------------
setlocal
set "HIER=%~dp0"
echo Setze Integritaetslabel auf "Mittel" fuer:
echo   %HIER%
echo.
icacls "%HIER%." /setintegritylevel (OI)(CI)Medium /T /C
icacls "%HIER%Netzwerk-Labor.exe" /setintegritylevel Medium
echo.
echo Fertig. Fenster schliessen und "Netzwerk-Labor" starten.
pause
