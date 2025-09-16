@echo off
echo ========================================
echo    LANCEMENT APPLICATION WEB SCAN
echo ========================================
echo.
echo Demarrage du serveur de developpement...
echo.
cd /d "%~dp0"
npx expo start --web --clear
echo.
echo Serveur arrete.
pause
