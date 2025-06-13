@echo off
title INOVIE SCAN - LANCEUR OFFICIEL

:start
cls
echo ======================================================
echo.
echo      LANCEUR OFFICIEL - INOVIE SCAN MOBILE
echo.
echo ======================================================
echo.

:: Se place dans le bon répertoire
cd /d "%~dp0"

echo Choisissez votre mode de lancement :
echo.
echo   [1] LAN (Rapide, pour appareil sur le meme reseau)
echo   [2] LOCALHOST (Pour emulateur ou test web)
echo   [3] NETTOYER LE CACHE & LANCER (Si bug)
echo   [4] Quitter
echo.

set /p choice="Votre choix : "

if "%choice%"=="1" goto lan
if "%choice%"=="2" goto localhost
if "%choice%"=="3" goto clear
if "%choice%"=="4" goto quit

echo.
echo Choix invalide.
pause
goto start

:lan
echo.
echo --- Lancement en mode LAN ---
npx expo start --lan
goto end

:localhost
echo.
echo --- Lancement en mode Localhost ---
npx expo start --localhost
goto end

:clear
echo.
echo --- Nettoyage du cache et lancement en LAN ---
npx expo start --clear --lan
goto end

:quit
exit

:end
echo.
echo --- Session terminee ---
pause
goto start 