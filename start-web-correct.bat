@echo off
cd /d "C:\dev\inovie-scan-mobile"
echo Demarrage depuis: %CD%
echo Verification du fichier d'entree:
if exist "App.entry.js" (
    echo - App.entry.js TROUVE
) else (
    echo - App.entry.js MANQUANT
)
echo.
echo Demarrage du serveur Expo Web...
npx expo start --web --clear
pause
