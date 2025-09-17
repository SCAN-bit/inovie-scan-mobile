@echo off
title LANCEMENT APPLICATION WEB SCAN
color 0A

echo ========================================
echo    LANCEMENT APPLICATION WEB SCAN
echo ========================================
echo.

REM Se place dans le bon repertoire
cd /d "%~dp0"

echo Lancement de l'application web...
echo.
echo L'application va s'ouvrir dans votre navigateur
echo Appuyez sur Ctrl+C pour arreter
echo.

npx expo start --web

echo.
echo Application fermee.
pause