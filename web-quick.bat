@echo off
title INOVIE SCAN - MODE WEB RAPIDE
cd /d "%~dp0"

echo ===============================================
echo   INOVIE SCAN - DEMARRAGE WEB RAPIDE
echo ===============================================
echo.
echo Demarrage du serveur web...
echo Ouvrez http://localhost:19006 dans votre navigateur
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

npx expo start --web

echo.
echo Le serveur s'est arrete.
echo Appuyez sur une touche pour fermer...
pause > nul
