@echo off
title DEBUG WEB - NE SE FERME JAMAIS
color 0E

:loop
cls
echo ========================================
echo    DEBUG WEB - APPLICATION INOVIE SCAN
echo ========================================
echo.

cd /d "%~dp0"
echo Repertoire: %CD%

echo.
echo [1] Lancer en mode web
echo [2] Reinstaller les dependances
echo [3] Voir l'erreur complete
echo [4] Quitter
echo.

set /p choice="Votre choix : "

if "%choice%"=="1" goto web
if "%choice%"=="2" goto install
if "%choice%"=="3" goto error
if "%choice%"=="4" exit

echo Choix invalide
pause
goto loop

:web
echo.
echo --- Lancement en mode WEB ---
npx expo start --web
echo.
echo Appuyez sur une touche pour revenir au menu...
pause
goto loop

:install
echo.
echo --- Reinstallation des dependances ---
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del "package-lock.json"
npm install --legacy-peer-deps
echo.
echo Installation terminee !
pause
goto loop

:error
echo.
echo --- Test de l'erreur ---
npx expo start --web > error.log 2>&1
echo.
echo L'erreur a ete sauvegardee dans error.log
echo Voici les 20 dernieres lignes :
echo.
tail -n 20 error.log 2>nul || (
    echo tail non disponible, affichage complet :
    type error.log
)
echo.
pause
goto loop
